-- Migration: Create ch_client_health_scores table
-- Stores daily health score snapshots for each client

CREATE TABLE IF NOT EXISTS ch_client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ch_clients(id) ON DELETE CASCADE,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Overall score
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  tier TEXT NOT NULL CHECK (tier IN ('green', 'yellow', 'red')),

  -- Category sub-scores (0-100)
  product_usage_score INTEGER NOT NULL CHECK (product_usage_score >= 0 AND product_usage_score <= 100),
  engagement_score INTEGER NOT NULL CHECK (engagement_score >= 0 AND engagement_score <= 100),
  relationship_score INTEGER NOT NULL CHECK (relationship_score >= 0 AND relationship_score <= 100),
  support_score INTEGER NOT NULL CHECK (support_score >= 0 AND support_score <= 100),

  -- Raw metric values (for audit trail)
  login_count_30d INTEGER,
  features_used_count INTEGER,
  patient_records_trend TEXT,
  days_since_last_login INTEGER,
  feature_usage_mom_trend TEXT,
  exec_sponsor_status TEXT,
  qbrs_attended_last_2 INTEGER,
  nps_latest INTEGER,
  support_tickets_30d INTEGER,
  escalations_30d INTEGER,
  csat_latest NUMERIC(3,1),

  -- Manual override
  override_tier TEXT CHECK (override_tier IN ('green', 'yellow', 'red')),
  override_reason TEXT,
  override_by TEXT,
  override_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: one score per client per day
ALTER TABLE ch_client_health_scores
  ADD CONSTRAINT unique_client_score_date UNIQUE (client_id, score_date);

-- Indexes
CREATE INDEX idx_ch_health_scores_client ON ch_client_health_scores(client_id);
CREATE INDEX idx_ch_health_scores_date ON ch_client_health_scores(score_date DESC);
CREATE INDEX idx_ch_health_scores_tier ON ch_client_health_scores(tier);

-- RLS
ALTER TABLE ch_client_health_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON ch_client_health_scores
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON ch_client_health_scores
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON ch_client_health_scores
  FOR UPDATE TO authenticated USING (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ch_client_health_scores;
