import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { webhookId } = await request.json();

    if (!webhookId) {
      return new Response('Missing webhookId', { status: 400 });
    }

    // Get the webhook subscription
    const { data: webhook, error } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('id', webhookId)
      .single();

    if (error || !webhook) {
      return new Response('Webhook not found', { status: 404 });
    }

    // Create test payload
    const payload = {
      event_type: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from PM Dashboard',
        webhook_id: webhookId,
      },
    };

    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(body)
      .digest('hex');

    // Send test webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Timestamp': payload.timestamp,
      },
      body,
    });

    // Update last triggered
    await supabase
      .from('webhook_subscriptions')
      .update({ last_triggered: new Date().toISOString() })
      .eq('id', webhookId);

    return new Response(
      JSON.stringify({
        success: response.ok,
        status: response.status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error testing webhook:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
