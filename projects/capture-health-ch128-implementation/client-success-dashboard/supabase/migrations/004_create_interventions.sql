-- Migration: Create ch_interventions table
-- Tracks CSM interventions and their outcomes

CREATE TYPE ch_intervention_type AS ENUM (
  'phone_call',
  'email',
  'meeting',
  'qbr',
  'training',
  'onboarding_session',
  'executive_outreach',
  'product_demo',
  'escalation_response',
  'check_in',
  'other'
);

CREATE TYPE ch_intervention_outcome AS ENUM (
  'positive',
  'neutral',
  'negative',
  'pending',
  'no_response'
);

CREATE TABLE IF NOT EXISTS ch_interventions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES ch_clients(id) ON DELETE CASCADE,
  alert_id UUID REFERENCES ch_churn_alerts(id) ON DELETE SET NULL,

  -- Intervention details
  intervention_type ch_intervention_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  conducted_by TEXT NOT NULL,
  conducted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Outcome tracking
  outcome ch_intervention_outcome DEFAULT 'pending',
  outcome_notes TEXT,

  -- Follow-up
  follow_up_date DATE,
  follow_up_completed BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,

  -- Impact measurement
  health_score_before INTEGER CHECK (health_score_before >= 0 AND health_score_before <= 100),
  health_score_after INTEGER CHECK (health_score_after >= 0 AND health_score_after <= 100),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ch_interventions_client ON ch_interventions(client_id);
CREATE INDEX idx_ch_interventions_alert ON ch_interventions(alert_id);
CREATE INDEX idx_ch_interventions_type ON ch_interventions(intervention_type);
CREATE INDEX idx_ch_interventions_outcome ON ch_interventions(outcome);
CREATE INDEX idx_ch_interventions_followup ON ch_interventions(follow_up_date)
  WHERE follow_up_completed = FALSE;

-- RLS
ALTER TABLE ch_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON ch_interventions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert" ON ch_interventions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update" ON ch_interventions
  FOR UPDATE TO authenticated USING (true);

-- Updated at trigger
CREATE TRIGGER ch_interventions_updated_at
  BEFORE UPDATE ON ch_interventions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
