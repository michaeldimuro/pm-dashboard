-- Migration: Create ch_clients table
-- Stores client/account information for Capture Health

CREATE TABLE IF NOT EXISTS ch_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  mrr_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'at_risk', 'churned', 'onboarding')),

  -- Primary contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,

  -- Executive sponsor
  exec_sponsor_name TEXT,
  exec_sponsor_email TEXT,
  exec_sponsor_status TEXT DEFAULT 'none' CHECK (exec_sponsor_status IN ('active', 'passive', 'none')),

  -- Satisfaction scores
  nps_latest INTEGER CHECK (nps_latest >= 0 AND nps_latest <= 10),
  csat_latest NUMERIC(3,1) CHECK (csat_latest >= 1 AND csat_latest <= 5),

  -- QBR tracking
  last_qbr_date DATE,
  next_qbr_date DATE,
  qbrs_attended_last_2 INTEGER DEFAULT 0 CHECK (qbrs_attended_last_2 >= 0 AND qbrs_attended_last_2 <= 2),

  -- Usage metrics (updated by cron)
  login_count_30d INTEGER DEFAULT 0,
  days_since_last_login INTEGER DEFAULT 0,
  features_used_count INTEGER DEFAULT 0,
  feature_usage_mom_trend TEXT DEFAULT 'flat' CHECK (feature_usage_mom_trend IN ('increasing', 'flat', 'decreasing')),
  patient_records_trend TEXT DEFAULT 'stable' CHECK (patient_records_trend IN ('growth', 'stable', 'flat', 'declining')),
  active_users_count INTEGER DEFAULT 1,
  total_users_count INTEGER DEFAULT 1,

  -- Support metrics
  support_tickets_30d INTEGER DEFAULT 0,
  support_tickets_7d INTEGER DEFAULT 0,
  escalations_30d INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ch_clients_status ON ch_clients(status);
CREATE INDEX idx_ch_clients_plan_tier ON ch_clients(plan_tier);
CREATE INDEX idx_ch_clients_contract_end ON ch_clients(contract_end_date);

-- RLS
ALTER TABLE ch_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON ch_clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated update" ON ch_clients
  FOR UPDATE TO authenticated USING (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ch_clients_updated_at
  BEFORE UPDATE ON ch_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
