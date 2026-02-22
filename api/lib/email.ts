/**
 * Email Notification Helper
 * Sends formatted HTML emails via Resend API on status changes
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || 'michael@capturehealth.io';

const STATUS_COLORS: Record<string, string> = {
  READY_FOR_SALE: '#22c55e',
  PENDING_DEVELOPER_RELEASE: '#22c55e',
  REJECTED: '#ef4444',
  METADATA_REJECTED: '#ef4444',
  INVALID_BINARY: '#ef4444',
  IN_REVIEW: '#3b82f6',
  WAITING_FOR_REVIEW: '#3b82f6',
  PROCESSING_FOR_APP_STORE: '#f59e0b',
  PREPARE_FOR_SUBMISSION: '#6b7280',
  DEVELOPER_REJECTED: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_SALE: 'Approved - Live on App Store',
  PENDING_DEVELOPER_RELEASE: 'Approved - Pending Release',
  REJECTED: 'Rejected',
  METADATA_REJECTED: 'Metadata Rejected',
  IN_REVIEW: 'In Review',
  WAITING_FOR_REVIEW: 'Waiting for Review',
  PROCESSING_FOR_APP_STORE: 'Processing',
  PREPARE_FOR_SUBMISSION: 'Preparing for Submission',
  DEVELOPER_REJECTED: 'Developer Rejected',
  INVALID_BINARY: 'Invalid Binary',
};

/**
 * Send an email notification via Resend
 */
export async function sendEmailNotification(
  versionString: string,
  fromStatus: string | null,
  toStatus: string,
  timestamp: string
): Promise<{ ok: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] Missing RESEND_API_KEY — skipping');
    return { ok: false, error: 'Missing RESEND_API_KEY' };
  }

  const color = STATUS_COLORS[toStatus] || '#6b7280';
  const statusLabel = STATUS_LABELS[toStatus] || toStatus.replace(/_/g, ' ');
  const time = new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' });

  const isRejection = toStatus === 'REJECTED' || toStatus === 'METADATA_REJECTED';
  const isApproved = toStatus === 'READY_FOR_SALE' || toStatus === 'PENDING_DEVELOPER_RELEASE';

  let subject = `App Review: v${versionString} — ${statusLabel}`;
  if (isRejection) subject = `[ACTION REQUIRED] App Review: v${versionString} Rejected`;
  if (isApproved) subject = `App Review: v${versionString} Approved`;

  const fromStatusRow = fromStatus
    ? `<tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Previous Status</td><td style="padding:8px 16px;font-size:14px;">${fromStatus.replace(/_/g, ' ')}</td></tr>`
    : '';

  const actionBanner = isRejection
    ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-top:16px;color:#991b1b;font-size:14px;">
        <strong>Action Required:</strong> Check rejection details in App Store Connect and prepare a response.
      </div>`
    : isApproved
      ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-top:16px;color:#166534;font-size:14px;">
          Your app is now live on the App Store!
        </div>`
      : '';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:0;background:#f9fafb;">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:${color};padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;color:#fff;">App Review Update</h1>
    </div>
    <div style="padding:24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Version</td><td style="padding:8px 16px;font-size:14px;font-weight:600;">${versionString}</td></tr>
        <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Status</td><td style="padding:8px 16px;font-size:14px;font-weight:600;color:${color};">${statusLabel}</td></tr>
        ${fromStatusRow}
        <tr><td style="padding:8px 16px;color:#6b7280;font-size:14px;">Time</td><td style="padding:8px 16px;font-size:14px;">${time} ET</td></tr>
      </table>
      ${actionBanner}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f3f4f6;color:#9ca3af;font-size:12px;text-align:center;">
      PM Dashboard — App Review Monitor
    </div>
  </div>
</body>
</html>`.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'PM Dashboard <notifications@capturehealth.io>',
        to: [NOTIFICATION_EMAIL],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Email] Resend API failed:', body);
      return { ok: false, error: `Resend API error: ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('[Email] Exception:', err);
    return { ok: false, error: String(err) };
  }
}
