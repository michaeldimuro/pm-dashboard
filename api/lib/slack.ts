/**
 * Slack Notification Helper
 * Sends rich block-kit messages via incoming webhook
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

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

/**
 * Send a rich notification to Slack via incoming webhook
 */
export async function sendSlackNotification(
  versionString: string,
  fromStatus: string | null,
  toStatus: string,
  timestamp: string
): Promise<{ ok: boolean; error?: string }> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[Slack] Missing SLACK_WEBHOOK_URL — skipping');
    return { ok: false, error: 'Missing SLACK_WEBHOOK_URL' };
  }

  const color = STATUS_COLORS[toStatus] || '#6b7280';
  const time = new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' });
  const statusDisplay = toStatus.replace(/_/g, ' ');

  const fields = [
    { type: 'mrkdwn', text: `*Version:*\n${versionString}` },
    { type: 'mrkdwn', text: `*Status:*\n${statusDisplay}` },
  ];

  if (fromStatus) {
    fields.push({ type: 'mrkdwn', text: `*Previous:*\n${fromStatus.replace(/_/g, ' ')}` });
  }

  fields.push({ type: 'mrkdwn', text: `*Time:*\n${time} ET` });

  let contextText = '';
  if (toStatus === 'REJECTED' || toStatus === 'METADATA_REJECTED') {
    contextText = ':warning: *Action required:* Check rejection details in App Store Connect';
  } else if (toStatus === 'READY_FOR_SALE') {
    contextText = ':tada: App is now live on the App Store!';
  }

  const blocks: Record<string, unknown>[] = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: ':iphone: *App Review Update*' },
    },
    {
      type: 'section',
      fields,
    },
  ];

  if (contextText) {
    blocks.push({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: contextText }],
    });
  }

  const payload = {
    attachments: [{ color, blocks }],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Slack] Webhook failed:', body);
      return { ok: false, error: `Slack webhook error: ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('[Slack] Exception:', err);
    return { ok: false, error: String(err) };
  }
}
