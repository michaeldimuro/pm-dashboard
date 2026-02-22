import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateHealthScore } from '@/lib/health-score/calculator';
import { detectTriggers, deduplicateTriggers } from '@/lib/health-score/triggers';
import { sendSlackAlert } from '@/lib/notifications/slack';
import { sendEmailAlert } from '@/lib/notifications/email';
import type { Client, ClientMetrics } from '@/types';

export const dynamic = 'force-dynamic';

function clientToMetrics(client: Client): ClientMetrics {
  return {
    login_count_30d: client.login_count_30d,
    features_used_count: client.features_used_count,
    patient_records_trend: client.patient_records_trend,
    days_since_last_login: client.days_since_last_login,
    feature_usage_mom_trend: client.feature_usage_mom_trend,
    exec_sponsor_status: client.exec_sponsor_status,
    qbrs_attended_last_2: client.qbrs_attended_last_2,
    nps_latest: client.nps_latest,
    support_tickets_30d: client.support_tickets_30d,
    support_tickets_7d: client.support_tickets_7d,
    escalations_30d: client.escalations_30d,
    csat_latest: client.csat_latest,
    active_users_count: client.active_users_count,
    total_users_count: client.total_users_count,
  };
}

export async function POST(request: Request) {
  // Verify auth
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const results = { processed: 0, alerts_created: 0, errors: [] as string[] };

  try {
    // Fetch all active clients
    const { data: clients, error: clientsError } = await supabase
      .from('ch_clients')
      .select('*')
      .in('status', ['active', 'at_risk', 'onboarding']);

    if (clientsError) throw clientsError;
    if (!clients?.length) {
      return NextResponse.json({ message: 'No active clients', ...results });
    }

    for (const client of clients as Client[]) {
      try {
        // Calculate health score
        const metrics = clientToMetrics(client);
        const score = calculateHealthScore(metrics);

        // Upsert daily score
        const { error: upsertError } = await supabase
          .from('ch_client_health_scores')
          .upsert(
            {
              client_id: client.id,
              score_date: today,
              overall_score: score.overall_score,
              tier: score.tier,
              product_usage_score: score.product_usage.score,
              engagement_score: score.engagement.score,
              relationship_score: score.relationship.score,
              support_score: score.support.score,
              login_count_30d: client.login_count_30d,
              features_used_count: client.features_used_count,
              patient_records_trend: client.patient_records_trend,
              days_since_last_login: client.days_since_last_login,
              feature_usage_mom_trend: client.feature_usage_mom_trend,
              exec_sponsor_status: client.exec_sponsor_status,
              qbrs_attended_last_2: client.qbrs_attended_last_2,
              nps_latest: client.nps_latest,
              support_tickets_30d: client.support_tickets_30d,
              escalations_30d: client.escalations_30d,
              csat_latest: client.csat_latest,
            },
            { onConflict: 'client_id,score_date' }
          );

        if (upsertError) throw upsertError;

        // Detect triggers
        const triggers = detectTriggers(client);

        if (triggers.length > 0) {
          // Fetch existing alerts for deduplication
          const { data: existingAlerts } = await supabase
            .from('ch_churn_alerts')
            .select('*')
            .eq('client_id', client.id)
            .in('status', ['open', 'acknowledged']);

          const newTriggers = deduplicateTriggers(triggers, existingAlerts || []);

          for (const trigger of newTriggers) {
            // Create alert
            const { data: alert, error: alertError } = await supabase
              .from('ch_churn_alerts')
              .insert({
                client_id: client.id,
                priority: trigger.priority,
                trigger_type: trigger.trigger_type,
                title: trigger.title,
                description: trigger.description,
                metric_name: trigger.metric_name,
                metric_value: trigger.metric_value,
                threshold_value: trigger.threshold_value,
              })
              .select()
              .single();

            if (alertError) {
              results.errors.push(`Alert creation failed for ${client.company_name}: ${alertError.message}`);
              continue;
            }

            results.alerts_created++;

            // Send notifications for critical alerts
            if (trigger.priority === 'critical' && alert) {
              const slackSent = await sendSlackAlert(alert, client);
              const emailSent = await sendEmailAlert(alert, client);

              await supabase
                .from('ch_churn_alerts')
                .update({
                  slack_sent: slackSent,
                  slack_sent_at: slackSent ? new Date().toISOString() : null,
                  email_sent: emailSent,
                  email_sent_at: emailSent ? new Date().toISOString() : null,
                })
                .eq('id', alert.id);
            }
          }
        }

        // Update client status based on tier
        const newStatus = score.tier === 'red' ? 'at_risk' : 'active';
        if (client.status !== newStatus && client.status !== 'onboarding') {
          await supabase
            .from('ch_clients')
            .update({ status: newStatus })
            .eq('id', client.id);
        }

        results.processed++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.errors.push(`Failed processing ${client.company_name}: ${message}`);
      }
    }

    return NextResponse.json({
      success: true,
      date: today,
      ...results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
