import type { ChurnAlert, Client } from '@/types';

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  medium: '#f59e0b',
  low: '#6b7280',
};

const PRIORITY_EMOJI: Record<string, string> = {
  critical: ':rotating_light:',
  medium: ':warning:',
  low: ':information_source:',
};

interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  fields?: { type: string; text: string }[];
  elements?: { type: string; text: string }[];
}

function buildAlertBlocks(alert: ChurnAlert, client: Client): SlackBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${PRIORITY_EMOJI[alert.priority]} ${alert.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Client:*\n${client.company_name}` },
        { type: 'mrkdwn', text: `*Priority:*\n${alert.priority.toUpperCase()}` },
        { type: 'mrkdwn', text: `*Plan:*\n${client.plan_tier}` },
        { type: 'mrkdwn', text: `*MRR:*\n$${(client.mrr_cents / 100).toLocaleString()}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alert.description || 'No additional details.',
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Trigger: \`${alert.trigger_type}\` | Metric: ${alert.metric_name} = ${alert.metric_value} (threshold: ${alert.threshold_value})`,
        },
      ],
    },
  ];
}

export async function sendSlackAlert(
  alert: ChurnAlert,
  client: Client
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color: PRIORITY_COLORS[alert.priority],
            blocks: buildAlertBlocks(alert, client),
          },
        ],
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
    return false;
  }
}
