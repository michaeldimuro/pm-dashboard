/**
 * App Review Actions API
 * Manual actions for the review monitoring system
 *
 * POST /api/app-review/actions
 * Body: { action: "check_now" | "test_notification" | "mark_responded", submission_id?: string }
 */

import { createClient } from '@supabase/supabase-js';
import { fetchAppVersions } from '../lib/appstore-connect';
import { sendNotification } from '../lib/telegram';
import { sendSlackNotification } from '../lib/slack';
import { sendEmailNotification } from '../lib/email';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const API_KEY = process.env.OPERATIONS_API_KEY || 'ops-api-key-2026';

export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; body: unknown },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: unknown) => void; end: () => void };
  }
): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
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

  const body = req.body as Record<string, unknown>;
  const action = body?.action as string;

  if (!action) {
    res.status(400).json({ success: false, error: 'Missing action field' });
    return;
  }

  try {
    switch (action) {
      case 'check_now': {
        // Import poll handler and invoke it directly
        const pollModule = await import('./poll');
        await pollModule.default(req as any, res as any);
        return;
      }

      case 'test_notification': {
        const now = new Date().toISOString();
        const [telegramResult, slackResult, emailResult] = await Promise.allSettled([
          sendNotification(
            '🧪 <b>Test Notification</b>\n\nApp Review Monitor is working correctly.\n\n' +
              `<b>Time:</b> ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET`
          ),
          sendSlackNotification('TEST', null, 'IN_REVIEW', now),
          sendEmailNotification('TEST', null, 'IN_REVIEW', now),
        ]);

        const results = {
          telegram: telegramResult.status === 'fulfilled' ? telegramResult.value : { ok: false, error: String(telegramResult.reason) },
          slack: slackResult.status === 'fulfilled' ? slackResult.value : { ok: false, error: String(slackResult.reason) },
          email: emailResult.status === 'fulfilled' ? emailResult.value : { ok: false, error: String(emailResult.reason) },
        };

        const anyOk = results.telegram.ok || results.slack.ok || results.email.ok;
        res.status(200).json({ success: anyOk, channels: results });
        return;
      }

      case 'mark_responded': {
        const submissionId = body?.submission_id as string;
        if (!submissionId) {
          res.status(400).json({ success: false, error: 'Missing submission_id' });
          return;
        }

        const { error } = await supabase
          .from('app_review_submissions')
          .update({ response_sent: true })
          .eq('id', submissionId);

        if (error) {
          res.status(500).json({ success: false, error: error.message });
          return;
        }

        res.status(200).json({ success: true });
        return;
      }

      default:
        res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[Actions API] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}
