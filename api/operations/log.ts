/**
 * Operations Event Logging Endpoint
 * Receives events from OpenClaw agents and stores them in Supabase
 *
 * POST /api/operations/log
 * Body: OperationEventRequest
 */

import { createClient } from '@supabase/supabase-js';

// Supabase client with service role for write access
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Verify we have credentials
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('[Log API] Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// API key for authentication (simple bearer token)
const API_KEY = process.env.OPERATIONS_API_KEY || 'ops-api-key-2026';

/**
 * Event types
 */
interface OperationEventRequest {
  event_id: string;
  event_type: string;
  agent_id: string;
  session_id?: string;
  payload: Record<string, unknown>;
  triggered_at?: string;
}

interface AgentSessionRequest {
  agent_id: string;
  session_id: string;
  agent_name: string;
  agent_type: 'main' | 'subagent';
  parent_session_id?: string;
  status?: string;
  channel?: string;
  assigned_task?: string;
  progress_percent?: number;
  summary?: string;
}

/**
 * Main handler - Vercel Serverless Function
 */
export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; body: unknown },
  res: { 
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: unknown) => void; end: () => void };
  }
): Promise<void> {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Verify API key
  const authHeader = req.headers.authorization;
  const providedKey = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

  if (!providedKey || providedKey !== API_KEY) {
    console.warn('[Log API] Invalid or missing API key');
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const body = req.body as Record<string, unknown>;

    if (!body || typeof body !== 'object') {
      res.status(400).json({ success: false, error: 'Invalid request body' });
      return;
    }

    // Determine request type based on fields
    if ('event_type' in body) {
      // Log operation event
      const eventReq = body as unknown as OperationEventRequest;

      if (!eventReq.event_id || !eventReq.event_type || !eventReq.agent_id) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: event_id, event_type, agent_id' 
        });
        return;
      }

      const { error } = await supabase
        .from('operations_events')
        .insert([
          {
            event_id: eventReq.event_id,
            event_type: eventReq.event_type,
            agent_id: eventReq.agent_id,
            session_id: eventReq.session_id || null,
            payload: eventReq.payload || {},
            triggered_at: eventReq.triggered_at || new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('[Log API] Event insert error:', error);
        res.status(500).json({ success: false, error: error.message });
        return;
      }

      console.log(`[Log API] Event logged: ${eventReq.event_type} (${eventReq.event_id})`);
      res.status(200).json({ success: true, event_id: eventReq.event_id });

    } else if ('agent_name' in body) {
      // Upsert agent session
      const sessionReq = body as unknown as AgentSessionRequest;

      if (!sessionReq.agent_id || !sessionReq.session_id || !sessionReq.agent_name) {
        res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: agent_id, session_id, agent_name' 
        });
        return;
      }

      const { error } = await supabase
        .from('agent_sessions')
        .upsert(
          {
            agent_id: sessionReq.agent_id,
            session_id: sessionReq.session_id,
            agent_name: sessionReq.agent_name,
            agent_type: sessionReq.agent_type || 'subagent',
            parent_session_id: sessionReq.parent_session_id || null,
            status: sessionReq.status || 'active',
            channel: sessionReq.channel,
            assigned_task: sessionReq.assigned_task,
            progress_percent: sessionReq.progress_percent || 0,
            summary: sessionReq.summary,
            last_activity_at: new Date().toISOString(),
          },
          {
            onConflict: 'agent_id',
          }
        );

      if (error) {
        console.error('[Log API] Session upsert error:', error);
        res.status(500).json({ success: false, error: error.message });
        return;
      }

      console.log(`[Log API] Session upserted: ${sessionReq.agent_name} (${sessionReq.agent_id})`);
      res.status(200).json({ success: true, agent_id: sessionReq.agent_id });

    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Invalid request: must include event_type (for events) or agent_name (for sessions)' 
      });
    }

  } catch (err) {
    console.error('[Log API] Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
