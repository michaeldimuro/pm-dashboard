/**
 * Operations Event Logging Webhook
 * Receives events from agents and stores them in Supabase
 *
 * POST /api/operations/log
 * Body: { event: OperationEvent, timestamp: number }
 * Header: X-Signature: HMAC-SHA256 signature
 */

import { createClient } from '@supabase/supabase-js';
import { subtle } from 'crypto';

// Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.OPERATIONS_WEBHOOK_SECRET!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Types
interface OperationEvent {
  id: string;
  type: string;
  timestamp: string;
  agent_id: string;
  session_id: string;
  payload: Record<string, any>;
}

interface LogRequest {
  event: OperationEvent;
  timestamp: number;
  signature?: string;
}

/**
 * Verify HMAC signature
 * Reconstructs the signature from event + timestamp to verify authenticity
 */
async function verifySignature(
  event: OperationEvent,
  timestamp: number,
  signature: string
): Promise<boolean> {
  try {
    // Reconstruct the exact payload that was signed
    const payload = JSON.stringify({ event, timestamp });
    
    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const computed = await subtle.sign('HMAC', key, encoder.encode(payload));
    const computedHex = Array.from(new Uint8Array(computed))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return computedHex === signature;
  } catch (err) {
    console.error('[Signature] Verification error:', err);
    return false;
  }
}

/**
 * Validate event structure
 */
function validateEvent(event: any): event is OperationEvent {
  if (!event || typeof event !== 'object') {
    return false;
  }

  const required = ['id', 'type', 'timestamp', 'agent_id', 'session_id', 'payload'];
  return required.every(field => field in event && event[field] !== undefined);
}

/**
 * Main handler
 */
export default async function handler(req: Request): Promise<Response> {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get body
    const body = await req.text();
    if (!body) {
      return new Response(
        JSON.stringify({ success: false, error: 'Empty body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON
    let logRequest: LogRequest;
    try {
      logRequest = JSON.parse(body) as LogRequest;
    } catch (err) {
      console.error('[Log] Parse error:', err);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { event: operationEvent, timestamp, signature } = logRequest;

    if (!signature) {
      console.warn('[Log] Missing signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify signature
    const isValid = await verifySignature(operationEvent, timestamp, signature);
    if (!isValid) {
      console.warn('[Log] Invalid signature');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate event
    if (!validateEvent(operationEvent)) {
      console.warn('[Log] Invalid event structure:', operationEvent);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid event structure' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Log] Inserting event: ${operationEvent.type} (${operationEvent.id})`);

    // Insert into operations_events
    const { error: insertError } = await supabase
      .from('operations_events')
      .insert([
        {
          event_id: operationEvent.id,
          event_type: operationEvent.type,
          agent_id: operationEvent.agent_id,
          session_id: operationEvent.session_id,
          payload: operationEvent.payload,
          triggered_at: operationEvent.timestamp,
        },
      ]);

    if (insertError) {
      console.error('[Log] Insert error:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: insertError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Also update agent_sessions if this is a session event
    if (operationEvent.type === 'agent.session.started') {
      const { error: sessionError } = await supabase
        .from('agent_sessions')
        .insert([
          {
            agent_id: operationEvent.agent_id,
            session_id: operationEvent.session_id,
            agent_name: operationEvent.payload.agent_name || operationEvent.agent_id,
            agent_type: operationEvent.payload.agent_type || 'main',
            status: 'active',
            channel: operationEvent.payload.channel,
            assigned_task: operationEvent.payload.initial_task,
            metadata: operationEvent.payload.metadata || {},
          },
        ])
        .select('*')
        .single();

      if (sessionError && !sessionError.message.includes('duplicate')) {
        console.warn('[Log] Could not create session:', sessionError);
      }
    } else if (operationEvent.type === 'agent.session.terminated' || operationEvent.type === 'subagent.completed') {
      // Update session status
      const { error: updateError } = await supabase
        .from('agent_sessions')
        .update({
          status: 'terminated',
          terminated_at: operationEvent.timestamp,
          summary: operationEvent.payload.summary,
          progress_percent: 100,
        })
        .eq('session_id', operationEvent.session_id);

      if (updateError) {
        console.warn('[Log] Could not update session:', updateError);
      }
    } else if (operationEvent.type === 'agent.status_updated') {
      // Update session progress
      const { error: updateError } = await supabase
        .from('agent_sessions')
        .update({
          status: operationEvent.payload.status === 'working' ? 'active' : 'idle',
          progress_percent: operationEvent.payload.progress_percent || 0,
          estimated_completion: operationEvent.payload.estimated_completion,
          last_activity_at: operationEvent.timestamp,
        })
        .eq('session_id', operationEvent.session_id);

      if (updateError) {
        console.warn('[Log] Could not update session progress:', updateError);
      }
    }

    console.log(`[Log] Event logged successfully: ${operationEvent.id}`);

    return new Response(
      JSON.stringify({ success: true, event_id: operationEvent.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[Log] Unhandled error:', err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Export for Vercel
export const config = {
  runtime: 'edge',
};
