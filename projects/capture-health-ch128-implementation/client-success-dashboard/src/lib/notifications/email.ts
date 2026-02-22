import type { ChurnAlert, Client } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  medium: '#f59e0b',
  low: '#6b7280',
};

function buildEmailHtml(alert: ChurnAlert, client: Client): string {
  const color = PRIORITY_COLORS[alert.priority];
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${color}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0; font-size: 18px;">${alert.priority.toUpperCase()} Alert: ${alert.title}</h2>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; margin-bottom: 16px;">
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">Client</td>
            <td style="padding: 4px 8px; font-weight: 600;">${client.company_name}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">Plan</td>
            <td style="padding: 4px 8px;">${client.plan_tier}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">MRR</td>
            <td style="padding: 4px 8px;">$${(client.mrr_cents / 100).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 8px; color: #6b7280;">Contact</td>
            <td style="padding: 4px 8px;">${client.primary_contact_name || 'N/A'} (${client.primary_contact_email || 'N/A'})</td>
          </tr>
        </table>
        <p style="color: #374151; line-height: 1.6;">${alert.description || ''}</p>
        <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 16px;">
          <p style="margin: 0; font-size: 13px; color: #6b7280;">
            Trigger: <code>${alert.trigger_type}</code> |
            ${alert.metric_name}: ${alert.metric_value} (threshold: ${alert.threshold_value})
          </p>
        </div>
      </div>
    </div>
  `;
}

export async function sendEmailAlert(
  alert: ChurnAlert,
  client: Client,
  recipientEmail?: string
): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL;
  const toEmail = recipientEmail || process.env.CSM_ALERT_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    console.warn('SendGrid not configured, skipping email notification');
    return false;
  }

  try {
    const sgMail = await import('@sendgrid/mail');
    sgMail.default.setApiKey(apiKey);

    await sgMail.default.send({
      to: toEmail,
      from: fromEmail,
      subject: `[${alert.priority.toUpperCase()}] ${alert.title} - ${client.company_name}`,
      html: buildEmailHtml(alert, client),
    });

    return true;
  } catch (error) {
    console.error('Failed to send email alert:', error);
    return false;
  }
}
