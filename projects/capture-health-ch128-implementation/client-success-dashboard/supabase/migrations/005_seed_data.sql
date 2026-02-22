-- Seed: Sample clients for development

INSERT INTO ch_clients (
  id, company_name, plan_tier, contract_start_date, contract_end_date,
  mrr_cents, status,
  primary_contact_name, primary_contact_email,
  exec_sponsor_name, exec_sponsor_email, exec_sponsor_status,
  nps_latest, csat_latest,
  last_qbr_date, next_qbr_date, qbrs_attended_last_2,
  login_count_30d, days_since_last_login, features_used_count,
  feature_usage_mom_trend, patient_records_trend,
  active_users_count, total_users_count,
  support_tickets_30d, support_tickets_7d, escalations_30d
) VALUES
(
  'a1111111-1111-1111-1111-111111111111',
  'Riverside Medical Group',
  'enterprise',
  '2025-03-01',
  '2026-03-01',
  250000, -- $2,500/mo
  'active',
  'Dr. Sarah Chen', 'schen@riversidemedical.com',
  'James Rivera', 'jrivera@riversidemedical.com', 'active',
  9, 4.5,
  '2026-01-15', '2026-04-15', 2,
  22, 2, 7,
  'increasing', 'growth',
  8, 10,
  1, 0, 0
),
(
  'b2222222-2222-2222-2222-222222222222',
  'Summit Telehealth Partners',
  'professional',
  '2025-06-15',
  '2026-06-15',
  150000, -- $1,500/mo
  'at_risk',
  'Mike Torres', 'mtorres@summittelehealth.com',
  NULL, NULL, 'none',
  6, 2.8,
  '2025-10-01', NULL, 0,
  3, 18, 2,
  'decreasing', 'declining',
  1, 5,
  5, 3, 2
);

-- Seed health scores for the last 7 days
INSERT INTO ch_client_health_scores (
  client_id, score_date, overall_score, tier,
  product_usage_score, engagement_score, relationship_score, support_score,
  login_count_30d, features_used_count, patient_records_trend,
  days_since_last_login, feature_usage_mom_trend,
  exec_sponsor_status, qbrs_attended_last_2, nps_latest,
  support_tickets_30d, escalations_30d, csat_latest
)
SELECT
  'a1111111-1111-1111-1111-111111111111',
  CURRENT_DATE - (d || ' days')::INTERVAL,
  85 + (random() * 5)::INTEGER,
  'green',
  90, 85, 80, 90,
  22, 7, 'growth',
  2, 'increasing',
  'active', 2, 9,
  1, 0, 4.5
FROM generate_series(0, 6) AS d;

INSERT INTO ch_client_health_scores (
  client_id, score_date, overall_score, tier,
  product_usage_score, engagement_score, relationship_score, support_score,
  login_count_30d, features_used_count, patient_records_trend,
  days_since_last_login, feature_usage_mom_trend,
  exec_sponsor_status, qbrs_attended_last_2, nps_latest,
  support_tickets_30d, escalations_30d, csat_latest
)
SELECT
  'b2222222-2222-2222-2222-222222222222',
  CURRENT_DATE - (d || ' days')::INTERVAL,
  GREATEST(25, 40 - d * 2 + (random() * 5)::INTEGER),
  CASE WHEN 40 - d * 2 >= 50 THEN 'yellow' ELSE 'red' END,
  30, 25, 20, 15,
  3, 2, 'declining',
  18, 'decreasing',
  'none', 0, 6,
  5, 2, 2.8
FROM generate_series(0, 6) AS d;

-- Seed alerts for at-risk client
INSERT INTO ch_churn_alerts (
  client_id, priority, status, trigger_type, title, description,
  metric_name, metric_value, threshold_value
) VALUES
(
  'b2222222-2222-2222-2222-222222222222',
  'critical', 'open', 'login_drought',
  'Login drought detected',
  'Summit Telehealth Partners has not logged in for 18 days (threshold: 14 days)',
  'days_since_last_login', 18, 14
),
(
  'b2222222-2222-2222-2222-222222222222',
  'critical', 'open', 'nps_detractor',
  'NPS detractor score',
  'Summit Telehealth Partners reported NPS score of 6 (detractor range: 0-6)',
  'nps_latest', 6, 6
),
(
  'b2222222-2222-2222-2222-222222222222',
  'medium', 'open', 'missed_qbr',
  'Missed QBR meetings',
  'Summit Telehealth Partners has attended 0 of last 2 QBR meetings',
  'qbrs_attended_last_2', 0, 1
);
