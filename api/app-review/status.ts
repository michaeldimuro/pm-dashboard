/**
 * App Review Status API
 * Returns latest submission + recent status changes
 *
 * GET /api/app-review/status
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_KEY = process.env.OPERATIONS_API_KEY || 'ops-api-key-2026';

export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; query?: Record<string, string> },
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

  // Auth
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const providedKey = authHeader.replace('Bearer ', '');
  if (!providedKey || providedKey !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    // Fetch latest submission
    const { data: latestSubmission, error: subError } = await supabase
      .from('app_review_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    // Fetch all submissions
    const { data: submissions, error: allSubError } = await supabase
      .from('app_review_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (allSubError) throw allSubError;

    // Fetch recent status changes
    const { data: statusChanges, error: changesError } = await supabase
      .from('app_review_status_changes')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(100);

    if (changesError) throw changesError;

    // Fetch templates
    const { data: templates, error: templatesError } = await supabase
      .from('app_review_rejection_templates')
      .select('*')
      .order('guideline_code', { ascending: true });

    if (templatesError) throw templatesError;

    res.status(200).json({
      success: true,
      data: {
        currentSubmission: latestSubmission || null,
        submissions: submissions || [],
        statusChanges: statusChanges || [],
        templates: templates || [],
      },
    });
  } catch (err) {
    console.error('[Status API] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
