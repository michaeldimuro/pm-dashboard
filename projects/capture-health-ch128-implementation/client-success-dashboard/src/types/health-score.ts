// Domain types for the Client Success Dashboard

export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type ClientStatus = 'active' | 'at_risk' | 'churned' | 'onboarding';
export type HealthTier = 'green' | 'yellow' | 'red';
export type UsageTrend = 'increasing' | 'flat' | 'decreasing';
export type PatientRecordsTrend = 'growth' | 'stable' | 'flat' | 'declining';
export type ExecSponsorStatus = 'active' | 'passive' | 'none';

export type AlertPriority = 'critical' | 'medium' | 'low';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved' | 'dismissed';

export type InterventionType =
  | 'phone_call' | 'email' | 'meeting' | 'qbr' | 'training'
  | 'onboarding_session' | 'executive_outreach' | 'product_demo'
  | 'escalation_response' | 'check_in' | 'other';

export type InterventionOutcome = 'positive' | 'neutral' | 'negative' | 'pending' | 'no_response';

export type TriggerType =
  | 'login_drought' | 'nps_detractor' | 'support_spike' | 'feature_crash'
  | 'declining_usage' | 'missed_qbr' | 'csat_drop' | 'nps_passive'
  | 'stagnant_usage' | 'single_user_reliance';

// --- Database row types ---

export interface Client {
  id: string;
  company_name: string;
  plan_tier: PlanTier;
  contract_start_date: string;
  contract_end_date: string | null;
  mrr_cents: number;
  status: ClientStatus;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  exec_sponsor_name: string | null;
  exec_sponsor_email: string | null;
  exec_sponsor_status: ExecSponsorStatus;
  nps_latest: number | null;
  csat_latest: number | null;
  last_qbr_date: string | null;
  next_qbr_date: string | null;
  qbrs_attended_last_2: number;
  login_count_30d: number;
  days_since_last_login: number;
  features_used_count: number;
  feature_usage_mom_trend: UsageTrend;
  patient_records_trend: PatientRecordsTrend;
  active_users_count: number;
  total_users_count: number;
  support_tickets_30d: number;
  support_tickets_7d: number;
  escalations_30d: number;
  created_at: string;
  updated_at: string;
}

export interface ClientHealthScore {
  id: string;
  client_id: string;
  score_date: string;
  overall_score: number;
  tier: HealthTier;
  product_usage_score: number;
  engagement_score: number;
  relationship_score: number;
  support_score: number;
  login_count_30d: number | null;
  features_used_count: number | null;
  patient_records_trend: string | null;
  days_since_last_login: number | null;
  feature_usage_mom_trend: string | null;
  exec_sponsor_status: string | null;
  qbrs_attended_last_2: number | null;
  nps_latest: number | null;
  support_tickets_30d: number | null;
  escalations_30d: number | null;
  csat_latest: number | null;
  override_tier: HealthTier | null;
  override_reason: string | null;
  override_by: string | null;
  override_at: string | null;
  created_at: string;
}

export interface ChurnAlert {
  id: string;
  client_id: string;
  priority: AlertPriority;
  status: AlertStatus;
  trigger_type: TriggerType;
  title: string;
  description: string | null;
  metric_name: string | null;
  metric_value: number | null;
  threshold_value: number | null;
  slack_sent: boolean;
  slack_sent_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
}

export interface Intervention {
  id: string;
  client_id: string;
  alert_id: string | null;
  intervention_type: InterventionType;
  title: string;
  description: string | null;
  conducted_by: string;
  conducted_at: string;
  outcome: InterventionOutcome;
  outcome_notes: string | null;
  follow_up_date: string | null;
  follow_up_completed: boolean;
  follow_up_notes: string | null;
  health_score_before: number | null;
  health_score_after: number | null;
  created_at: string;
  updated_at: string;
}

// --- Calculator types ---

export interface ClientMetrics {
  login_count_30d: number;
  features_used_count: number;
  patient_records_trend: PatientRecordsTrend;
  days_since_last_login: number;
  feature_usage_mom_trend: UsageTrend;
  exec_sponsor_status: ExecSponsorStatus;
  qbrs_attended_last_2: number;
  nps_latest: number | null;
  support_tickets_30d: number;
  support_tickets_7d: number;
  escalations_30d: number;
  csat_latest: number | null;
  active_users_count: number;
  total_users_count: number;
}

export interface CategoryScore {
  score: number;
  details: Record<string, number>;
}

export interface HealthScoreResult {
  overall_score: number;
  tier: HealthTier;
  product_usage: CategoryScore;
  engagement: CategoryScore;
  relationship: CategoryScore;
  support: CategoryScore;
}

export interface DetectedTrigger {
  trigger_type: TriggerType;
  priority: AlertPriority;
  title: string;
  description: string;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
}

// --- Client with latest score (for list views) ---

export interface ClientWithHealth extends Client {
  latest_score?: ClientHealthScore;
  open_alerts_count?: number;
}
