/**
 * App Review Poll Endpoint
 * Triggered by Vercel Cron every 5 minutes
 * Fetches current version status from App Store Connect, detects changes,
 * updates Supabase, and sends Telegram notifications
 *
 * GET /api/app-review/poll
 */

import { createClient } from '@supabase/supabase-js';
import { fetchAppVersions } from '../lib/appstore-connect';
import { sendNotification, formatStatusChangeMessage } from '../lib/telegram';
import { sendSlackNotification } from '../lib/slack';
import { sendEmailNotification } from '../lib/email';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CRON_SECRET = process.env.CRON_SECRET || '';

export default async function handler(
  req: { method?: string; headers: Record<string, string | string[] | undefined>; body: unknown },
  res: {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => { json: (data: unknown) => void; end: () => void };
  }
): Promise<void> {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Auth: Vercel cron sends authorization header, or accept CRON_SECRET
  const authHeader = typeof req.headers.authorization === 'string' ? req.headers.authorization : '';
  const cronAuth = authHeader.replace('Bearer ', '');

  // Also check for the OPERATIONS_API_KEY for manual triggers
  const API_KEY = process.env.OPERATIONS_API_KEY || 'ops-api-key-2026';

  if (CRON_SECRET && cronAuth !== CRON_SECRET && cronAuth !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    console.log('[Poll] Fetching App Store Connect versions...');
    const ascResponse = await fetchAppVersions();

    if (!ascResponse.data || ascResponse.data.length === 0) {
      console.log('[Poll] No versions found');
      res.status(200).json({ success: true, message: 'No versions found' });
      return;
    }

    // Process each version (typically just the latest)
    const results = [];

    for (const version of ascResponse.data) {
      const versionId = version.id;
      const versionString = version.attributes.versionString;
      const platform = version.attributes.platform;
      const newStatus = version.attributes.appStoreState;

      // Find submission date from included data
      const submissionRef = version.relationships?.appStoreVersionSubmission?.data;
      const submission = submissionRef
        ? ascResponse.included?.find((inc) => inc.id === submissionRef.id)
        : null;
      const submittedAt = submission?.attributes?.submittedDate || null;

      // Get current record from DB
      const { data: existing } = await supabase
        .from('app_review_submissions')
        .select('*')
        .eq('version_id', versionId)
        .single();

      const oldStatus = existing?.current_status || null;

      if (oldStatus === newStatus) {
        results.push({ version_id: versionId, status: newStatus, changed: false });
        continue;
      }

      console.log(`[Poll] Status change detected: ${versionString} ${oldStatus} → ${newStatus}`);

      // Determine review timing
      const now = new Date().toISOString();
      const reviewStartedAt =
        newStatus === 'IN_REVIEW'
          ? now
          : existing?.review_started_at || null;
      const reviewEndedAt =
        ['READY_FOR_SALE', 'REJECTED', 'METADATA_REJECTED', 'PENDING_DEVELOPER_RELEASE'].includes(newStatus)
          ? now
          : existing?.review_ended_at || null;

      // Upsert submission record
      const { error: upsertError } = await supabase
        .from('app_review_submissions')
        .upsert(
          {
            version_id: versionId,
            version_string: versionString,
            platform,
            current_status: newStatus,
            submitted_at: submittedAt || existing?.submitted_at || null,
            review_started_at: reviewStartedAt,
            review_ended_at: reviewEndedAt,
          },
          { onConflict: 'version_id' }
        );

      if (upsertError) {
        console.error('[Poll] Upsert error:', upsertError);
        continue;
      }

      // Get the submission ID for the status change log
      const { data: submissionRow } = await supabase
        .from('app_review_submissions')
        .select('id')
        .eq('version_id', versionId)
        .single();

      if (!submissionRow) continue;

      // Insert status change log
      const { error: changeError } = await supabase
        .from('app_review_status_changes')
        .insert({
          submission_id: submissionRow.id,
          from_status: oldStatus,
          to_status: newStatus,
          changed_at: now,
        });

      if (changeError) {
        console.error('[Poll] Status change insert error:', changeError);
      }

      // Send notifications to all channels in parallel (each independent)
      const telegramMessage = formatStatusChangeMessage(versionString, oldStatus, newStatus, now);
      const [telegramResult, slackResult, emailResult] = await Promise.allSettled([
        sendNotification(telegramMessage),
        sendSlackNotification(versionString, oldStatus, newStatus, now),
        sendEmailNotification(versionString, oldStatus, newStatus, now),
      ]);

      // Mark notification as sent if any channel succeeded
      const anyOk =
        (telegramResult.status === 'fulfilled' && telegramResult.value.ok) ||
        (slackResult.status === 'fulfilled' && slackResult.value.ok) ||
        (emailResult.status === 'fulfilled' && emailResult.value.ok);

      if (anyOk) {
        await supabase
          .from('app_review_status_changes')
          .update({ notified: true, notification_sent_at: now })
          .eq('submission_id', submissionRow.id)
          .eq('to_status', newStatus)
          .eq('changed_at', now);
      }

      // On rejection: auto-draft response from templates
      if (newStatus === 'REJECTED' || newStatus === 'METADATA_REJECTED') {
        await handleRejection(submissionRow.id, versionString);
      }

      results.push({ version_id: versionId, status: newStatus, changed: true, from: oldStatus });
    }

    res.status(200).json({ success: true, results });
  } catch (err) {
    console.error('[Poll] Error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

/**
 * Handle rejection: look up template by guideline code and draft a response
 */
async function handleRejection(submissionId: string, versionString: string): Promise<void> {
  // Get the submission to check for guideline code
  const { data: submission } = await supabase
    .from('app_review_submissions')
    .select('rejection_guideline_code')
    .eq('id', submissionId)
    .single();

  if (!submission?.rejection_guideline_code) {
    // No guideline code — draft a generic response
    await supabase
      .from('app_review_submissions')
      .update({
        draft_response: `Thank you for reviewing ${versionString}. We have addressed the feedback and made the necessary changes. Please review our updated submission.`,
      })
      .eq('id', submissionId);
    return;
  }

  // Look up template
  const { data: template } = await supabase
    .from('app_review_rejection_templates')
    .select('*')
    .eq('guideline_code', submission.rejection_guideline_code)
    .single();

  if (template) {
    await supabase
      .from('app_review_submissions')
      .update({ draft_response: template.response_template })
      .eq('id', submissionId);

    // Notify about draft response
    const tips = template.tips?.length
      ? '\n\n💡 <b>Tips:</b>\n' + template.tips.map((t: string) => `• ${t}`).join('\n')
      : '';

    await sendNotification(
      `📋 <b>Draft Response Ready</b>\n\nGuideline ${template.guideline_code}: ${template.guideline_title}\n\nA draft response has been prepared for v${versionString}.${tips}`
    );
  }
}
