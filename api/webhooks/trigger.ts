import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key for server-side operations
);

export interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

async function sendWebhook(url: string, secret: string, payload: WebhookPayload): Promise<boolean> {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body,
    });

    return response.ok;
  } catch (error) {
    console.error('Webhook delivery failed:', error);
    return false;
  }
}

export async function triggerWebhooks(
  userId: string,
  eventType: string,
  data: Record<string, unknown>
) {
  // Get active webhook subscriptions for this event type
  const { data: subscriptions, error } = await supabase
    .from('webhook_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .contains('events', [eventType]);

  if (error || !subscriptions) {
    console.error('Error fetching webhooks:', error);
    return;
  }

  const payload: WebhookPayload = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    data,
  };

  // Send webhooks in parallel
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const success = await sendWebhook(sub.url, sub.secret, payload);

      // Update subscription stats
      await supabase
        .from('webhook_subscriptions')
        .update({
          last_triggered: new Date().toISOString(),
          failure_count: success ? 0 : sub.failure_count + 1,
        })
        .eq('id', sub.id);

      return { id: sub.id, success };
    })
  );

  return results;
}

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { userId, eventType, data } = await request.json();

    if (!userId || !eventType) {
      return new Response('Missing required fields', { status: 400 });
    }

    const results = await triggerWebhooks(userId, eventType, data);

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error triggering webhooks:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
