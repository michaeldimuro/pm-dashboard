/**
 * Agent Metrics Endpoint
 * GET /api/operations/metrics?agent_id=atlas&range=week
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_KEY = process.env.OPERATIONS_API_KEY || 'ops-api-key-2026';

export default async function handler(
  req: {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    query?: Record<string, string | string[] | undefined>;
  },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: unknown) => void; end: () => void };
  }
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  const providedKey = typeof authHeader === 'string' ? authHeader.replace('Bearer ', '') : '';

  if (!providedKey || providedKey !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const agentId = req.query?.agent_id as string | undefined;
    const range = (req.query?.range as string) || 'month';

    const daysMap: Record<string, number> = { today: 1, week: 7, month: 30 };
    const days = daysMap[range] || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let query = supabase
      .from('agent_metrics')
      .select('*')
      .gte('metric_date', since)
      .order('metric_date', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(200).json({ success: true, metrics: data || [] });
  } catch (err) {
    console.error('[Metrics API] Error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
