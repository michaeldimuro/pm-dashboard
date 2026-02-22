import type { Client, DetectedTrigger, ChurnAlert } from '@/types';

// Deduplication window in days
const DEDUP_WINDOW_DAYS = 7;

export function detectTriggers(client: Client): DetectedTrigger[] {
  const triggers: DetectedTrigger[] = [];

  // --- Critical triggers ---

  // Login drought: 14+ days since last login
  if (client.days_since_last_login >= 14) {
    triggers.push({
      trigger_type: 'login_drought',
      priority: 'critical',
      title: 'Login drought detected',
      description: `${client.company_name} has not logged in for ${client.days_since_last_login} days (threshold: 14 days)`,
      metric_name: 'days_since_last_login',
      metric_value: client.days_since_last_login,
      threshold_value: 14,
    });
  }

  // NPS detractor: 0-6
  if (client.nps_latest !== null && client.nps_latest <= 6) {
    triggers.push({
      trigger_type: 'nps_detractor',
      priority: 'critical',
      title: 'NPS detractor score',
      description: `${client.company_name} reported NPS score of ${client.nps_latest} (detractor range: 0-6)`,
      metric_name: 'nps_latest',
      metric_value: client.nps_latest,
      threshold_value: 6,
    });
  }

  // Support spike: 3+ tickets in 7 days
  if (client.support_tickets_7d >= 3) {
    triggers.push({
      trigger_type: 'support_spike',
      priority: 'critical',
      title: 'Support ticket spike',
      description: `${client.company_name} has ${client.support_tickets_7d} support tickets in the last 7 days (threshold: 3)`,
      metric_name: 'support_tickets_7d',
      metric_value: client.support_tickets_7d,
      threshold_value: 3,
    });
  }

  // Feature crash: feature usage decreasing + low count (proxy for 50%+ drop)
  if (client.feature_usage_mom_trend === 'decreasing' && client.features_used_count <= 2) {
    triggers.push({
      trigger_type: 'feature_crash',
      priority: 'critical',
      title: 'Feature usage crash',
      description: `${client.company_name} feature usage is declining with only ${client.features_used_count} features in use`,
      metric_name: 'features_used_count',
      metric_value: client.features_used_count,
      threshold_value: 2,
    });
  }

  // --- Medium triggers ---

  // Declining usage: decreasing trend (30%+ proxy)
  if (client.feature_usage_mom_trend === 'decreasing' && client.features_used_count > 2) {
    triggers.push({
      trigger_type: 'declining_usage',
      priority: 'medium',
      title: 'Declining feature usage',
      description: `${client.company_name} feature usage is trending downward month-over-month`,
      metric_name: 'feature_usage_mom_trend',
      metric_value: 0,
      threshold_value: 1,
    });
  }

  // Missed QBR: 0 out of last 2
  if (client.qbrs_attended_last_2 === 0) {
    triggers.push({
      trigger_type: 'missed_qbr',
      priority: 'medium',
      title: 'Missed QBR meetings',
      description: `${client.company_name} has attended 0 of last 2 QBR meetings`,
      metric_name: 'qbrs_attended_last_2',
      metric_value: client.qbrs_attended_last_2,
      threshold_value: 1,
    });
  }

  // CSAT drop: score <= 3
  if (client.csat_latest !== null && client.csat_latest <= 3) {
    triggers.push({
      trigger_type: 'csat_drop',
      priority: 'medium',
      title: 'CSAT score drop',
      description: `${client.company_name} CSAT score is ${client.csat_latest} (threshold: <=3)`,
      metric_name: 'csat_latest',
      metric_value: client.csat_latest,
      threshold_value: 3,
    });
  }

  // NPS passive: 7-8
  if (client.nps_latest !== null && client.nps_latest >= 7 && client.nps_latest <= 8) {
    triggers.push({
      trigger_type: 'nps_passive',
      priority: 'medium',
      title: 'NPS passive score',
      description: `${client.company_name} reported NPS score of ${client.nps_latest} (passive range: 7-8)`,
      metric_name: 'nps_latest',
      metric_value: client.nps_latest,
      threshold_value: 7,
    });
  }

  // --- Low triggers ---

  // Stagnant usage: flat trend for extended period (using flat + low features as proxy)
  if (client.feature_usage_mom_trend === 'flat' && client.features_used_count <= 3) {
    triggers.push({
      trigger_type: 'stagnant_usage',
      priority: 'low',
      title: 'Stagnant feature usage',
      description: `${client.company_name} feature usage has been flat with only ${client.features_used_count} features adopted`,
      metric_name: 'features_used_count',
      metric_value: client.features_used_count,
      threshold_value: 3,
    });
  }

  // Single user reliance
  if (client.active_users_count === 1 && client.total_users_count > 1) {
    triggers.push({
      trigger_type: 'single_user_reliance',
      priority: 'low',
      title: 'Single user reliance',
      description: `${client.company_name} has only 1 active user out of ${client.total_users_count} total users`,
      metric_name: 'active_users_count',
      metric_value: client.active_users_count,
      threshold_value: 2,
    });
  }

  return triggers;
}

// Filter out triggers that already have recent open alerts
export function deduplicateTriggers(
  triggers: DetectedTrigger[],
  existingAlerts: ChurnAlert[]
): DetectedTrigger[] {
  const now = new Date();
  const windowMs = DEDUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return triggers.filter((trigger) => {
    const recentDuplicate = existingAlerts.find((alert) => {
      if (alert.trigger_type !== trigger.trigger_type) return false;
      if (alert.status === 'resolved' || alert.status === 'dismissed') return false;
      const alertAge = now.getTime() - new Date(alert.created_at).getTime();
      return alertAge < windowMs;
    });
    return !recentDuplicate;
  });
}
