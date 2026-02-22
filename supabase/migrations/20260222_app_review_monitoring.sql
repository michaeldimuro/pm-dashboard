-- App Store Review Monitoring Tables
-- Tracks App Store Connect review submissions, status changes, and rejection templates

-- ============================================================
-- 1. app_review_submissions — Core table for each version submission
-- ============================================================
CREATE TABLE IF NOT EXISTS app_review_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_string TEXT NOT NULL,
  version_id TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL DEFAULT 'IOS',
  current_status TEXT NOT NULL DEFAULT 'PREPARE_FOR_SUBMISSION',
  submitted_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  review_ended_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejection_guideline_code TEXT,
  draft_response TEXT,
  response_sent BOOLEAN NOT NULL DEFAULT FALSE,
  app_store_url TEXT,
  build_number TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. app_review_status_changes — Immutable log of every transition
-- ============================================================
CREATE TABLE IF NOT EXISTS app_review_status_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES app_review_submissions(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  notification_sent_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. app_review_rejection_templates — Response templates by guideline
-- ============================================================
CREATE TABLE IF NOT EXISTS app_review_rejection_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_code TEXT NOT NULL UNIQUE,
  guideline_title TEXT NOT NULL,
  response_template TEXT NOT NULL,
  tips TEXT[] DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_submissions_status ON app_review_submissions(current_status);
CREATE INDEX idx_submissions_submitted ON app_review_submissions(submitted_at DESC);
CREATE INDEX idx_status_changes_submission ON app_review_status_changes(submission_id);
CREATE INDEX idx_status_changes_changed ON app_review_status_changes(changed_at DESC);
CREATE INDEX idx_templates_guideline ON app_review_rejection_templates(guideline_code);

-- ============================================================
-- RLS Policies — public read, service role write
-- ============================================================
ALTER TABLE app_review_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_review_status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_review_rejection_templates ENABLE ROW LEVEL SECURITY;

-- Read access for authenticated users
CREATE POLICY "Allow authenticated read on submissions"
  ON app_review_submissions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on status_changes"
  ON app_review_status_changes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on templates"
  ON app_review_rejection_templates FOR SELECT
  TO authenticated
  USING (true);

-- Service role full access (for API endpoints)
CREATE POLICY "Allow service role all on submissions"
  ON app_review_submissions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role all on status_changes"
  ON app_review_status_changes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role all on templates"
  ON app_review_rejection_templates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Realtime publication
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE app_review_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE app_review_status_changes;

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_app_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON app_review_submissions
  FOR EACH ROW EXECUTE FUNCTION update_app_review_updated_at();

CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON app_review_rejection_templates
  FOR EACH ROW EXECUTE FUNCTION update_app_review_updated_at();

-- ============================================================
-- Seed common rejection templates
-- ============================================================
INSERT INTO app_review_rejection_templates (guideline_code, guideline_title, response_template, tips, severity) VALUES
(
  '2.1',
  'Performance: App Completeness',
  'Thank you for your feedback. We have addressed the app completeness concerns by [DESCRIBE CHANGES]. The app now [DESCRIBE IMPROVEMENT]. We have thoroughly tested all features and ensured they are fully functional.',
  ARRAY['Ensure all placeholder content is replaced', 'Test all features end-to-end before resubmission', 'Remove any beta/test/demo labels'],
  'high'
),
(
  '2.3',
  'Performance: Accurate Metadata',
  'We have updated our app metadata to accurately reflect the current functionality. Specifically, we have [DESCRIBE CHANGES]. All screenshots and descriptions now match the live app experience.',
  ARRAY['Update screenshots to match current UI', 'Ensure description matches actual features', 'Remove references to unreleased features'],
  'medium'
),
(
  '4.3',
  'Design: Spam',
  'We appreciate the feedback and have made changes to ensure our app provides a unique and valuable experience. We have [DESCRIBE CHANGES] to differentiate from existing apps and provide clear value to users.',
  ARRAY['Highlight unique features and value proposition', 'Remove duplicate functionality', 'Add clear differentiation from similar apps'],
  'high'
),
(
  '5.1.1',
  'Legal: Privacy - Data Collection and Storage',
  'We have updated our privacy practices to comply with guideline 5.1.1. Changes include: [DESCRIBE CHANGES]. Our privacy policy at [URL] has been updated to accurately reflect all data collection and usage.',
  ARRAY['Update privacy policy URL in App Store Connect', 'List all data collection in privacy nutrition labels', 'Implement data deletion mechanism if collecting user data'],
  'high'
),
(
  '4.0',
  'Design: General',
  'Thank you for the design feedback. We have improved the user experience by [DESCRIBE CHANGES]. The app now follows iOS Human Interface Guidelines more closely, including [SPECIFIC IMPROVEMENTS].',
  ARRAY['Review Apple HIG for current design patterns', 'Ensure native UI elements are used where appropriate', 'Test on multiple device sizes'],
  'medium'
),
(
  '2.5',
  'Performance: Software Requirements',
  'We have resolved the software compatibility issues by [DESCRIBE CHANGES]. The app has been tested on the minimum supported OS version and all required APIs are properly implemented.',
  ARRAY['Test on oldest supported iOS version', 'Remove usage of deprecated APIs', 'Ensure all required capabilities are declared in entitlements'],
  'medium'
)
ON CONFLICT (guideline_code) DO NOTHING;
