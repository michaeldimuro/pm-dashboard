/**
 * Telegram Notification Helper
 * Sends formatted messages to a configured Telegram chat
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

/**
 * Send a notification message to Telegram
 */
export async function sendNotification(message: string): Promise<{ ok: boolean; error?: string }> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return { ok: false, error: 'Missing Telegram credentials' };
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error('[Telegram] Send failed:', body);
      return { ok: false, error: `Telegram API error: ${response.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('[Telegram] Exception:', err);
    return { ok: false, error: String(err) };
  }
}

/**
 * Format a status change notification
 */
export function formatStatusChangeMessage(
  versionString: string,
  fromStatus: string | null,
  toStatus: string,
  timestamp: string
): string {
  const emojiMap: Record<string, string> = {
    PREPARE_FOR_SUBMISSION: '📝',
    WAITING_FOR_REVIEW: '⏳',
    IN_REVIEW: '🔍',
    PENDING_DEVELOPER_RELEASE: '✅',
    PROCESSING_FOR_APP_STORE: '⚙️',
    READY_FOR_SALE: '🟢',
    REJECTED: '❌',
    METADATA_REJECTED: '📋',
    DEVELOPER_REJECTED: '↩️',
    INVALID_BINARY: '⚠️',
  };

  const emoji = emojiMap[toStatus] || '📱';
  const time = new Date(timestamp).toLocaleString('en-US', { timeZone: 'America/New_York' });

  let message = `${emoji} <b>App Review Update</b>\n\n`;
  message += `<b>Version:</b> ${versionString}\n`;
  if (fromStatus) {
    message += `<b>From:</b> ${fromStatus.replace(/_/g, ' ')}\n`;
  }
  message += `<b>Status:</b> ${toStatus.replace(/_/g, ' ')}\n`;
  message += `<b>Time:</b> ${time} ET`;

  if (toStatus === 'REJECTED' || toStatus === 'METADATA_REJECTED') {
    message += '\n\n⚠️ <b>Action required:</b> Check rejection details in App Store Connect';
  } else if (toStatus === 'READY_FOR_SALE') {
    message += '\n\n🎉 App is now live on the App Store!';
  }

  return message;
}
