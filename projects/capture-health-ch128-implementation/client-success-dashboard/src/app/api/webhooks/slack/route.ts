import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSlackAlert } from '@/lib/notifications/slack';
import type { Client, ChurnAlert } from '@/types';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.WEBHOOK_API_KEY;

  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { alert_id } = body;

  if (!alert_id) {
    return NextResponse.json(
      { error: 'alert_id is required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Fetch alert with client
  const { data: alert, error: alertError } = await supabase
    .from('ch_churn_alerts')
    .select('*')
    .eq('id', alert_id)
    .single();

  if (alertError || !alert) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    );
  }

  const { data: client, error: clientError } = await supabase
    .from('ch_clients')
    .select('*')
    .eq('id', alert.client_id)
    .single();

  if (clientError || !client) {
    return NextResponse.json(
      { error: 'Client not found' },
      { status: 404 }
    );
  }

  const sent = await sendSlackAlert(alert as ChurnAlert, client as Client);

  if (sent) {
    await supabase
      .from('ch_churn_alerts')
      .update({
        slack_sent: true,
        slack_sent_at: new Date().toISOString(),
      })
      .eq('id', alert_id);
  }

  return NextResponse.json({ success: sent });
}
