-- Agent Profiles & Metrics for Multi-Agent Operations Dashboard
-- Migration: 20260218_agent_profiles_and_metrics.sql

-- =============================================================================
-- 1. Agent Profiles Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  description TEXT,
  avatar_color TEXT DEFAULT '#06b6d4',
  avatar_icon TEXT DEFAULT 'bot',
  default_model TEXT NOT NULL,
  status TEXT DEFAULT 'dormant' CHECK (status IN ('active', 'dormant', 'disabled')),
  capabilities TEXT[] DEFAULT '{}',
  assignee_user_id UUID,
  total_tasks_completed INT DEFAULT 0,
  total_tokens_used BIGINT DEFAULT 0,
  total_cost_cents INT DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

-- Public read access (operations page is public)
CREATE POLICY "agent_profiles_public_read" ON agent_profiles
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "agent_profiles_service_write" ON agent_profiles
  FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. Agent Metrics Table (time-series)
-- =============================================================================

CREATE TABLE IF NOT EXISTS agent_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL REFERENCES agent_profiles(agent_id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  tasks_completed INT DEFAULT 0,
  tasks_created INT DEFAULT 0,
  tokens_used BIGINT DEFAULT 0,
  cost_cents INT DEFAULT 0,
  sessions_count INT DEFAULT 0,
  avg_session_duration_ms INT DEFAULT 0,
  errors_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, metric_date)
);

-- Enable RLS
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "agent_metrics_public_read" ON agent_metrics
  FOR SELECT USING (true);

-- Only service role can modify
CREATE POLICY "agent_metrics_service_write" ON agent_metrics
  FOR ALL USING (auth.role() = 'service_role');

-- Index for time-series queries
CREATE INDEX idx_agent_metrics_date ON agent_metrics(agent_id, metric_date DESC);

-- =============================================================================
-- 3. Create Users for Atlas and Forge (so they can be task assignees)
-- =============================================================================

-- Atlas auth user (required before public.users due to FK)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  '00000000-0000-0000-0000-000000000000',
  'atlas@openclaw.local',
  crypt('agent-atlas-nologin', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Forge auth user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
  'f0e1d2c3-b4a5-4968-8776-5a4b3c2d1e0f',
  '00000000-0000-0000-0000-000000000000',
  'forge@openclaw.local',
  crypt('agent-forge-nologin', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Atlas public user
INSERT INTO users (id, email, full_name, businesses, created_at, updated_at)
VALUES (
  'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  'atlas@openclaw.local',
  'Atlas',
  ARRAY['capture_health', 'inspectable', 'synergy']::business_type[],
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Forge public user
INSERT INTO users (id, email, full_name, businesses, created_at, updated_at)
VALUES (
  'f0e1d2c3-b4a5-4968-8776-5a4b3c2d1e0f',
  'forge@openclaw.local',
  'Forge',
  ARRAY['capture_health', 'inspectable', 'synergy']::business_type[],
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 4. Seed Agent Profiles
-- =============================================================================

INSERT INTO agent_profiles (agent_id, display_name, role, description, avatar_color, avatar_icon, default_model, assignee_user_id, capabilities)
VALUES
  ('main', 'Xandus', 'Orchestrator', 'Lead agent — coordinates all other agents, manages task delegation, monitors progress', '#06b6d4', 'crown', 'claude-haiku-4-5', 'e703aeed-3e46-413f-bc27-2fce063176bc', ARRAY['orchestration', 'delegation', 'monitoring', 'communication']),
  ('atlas', 'Atlas', 'Research & Intelligence', 'Market analysis, competitive intelligence, business evaluations, trend research, report generation', '#8b5cf6', 'search', 'claude-sonnet-4-5', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', ARRAY['research', 'analysis', 'reports', 'competitive-intel']),
  ('forge', 'Forge', 'Development & Engineering', 'Feature development, bug fixes, deployments, code reviews, technical architecture', '#f59e0b', 'code', 'claude-haiku-4-5', 'f0e1d2c3-b4a5-4968-8776-5a4b3c2d1e0f', ARRAY['development', 'code-review', 'deployment', 'architecture'])
ON CONFLICT (agent_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  description = EXCLUDED.description,
  avatar_color = EXCLUDED.avatar_color,
  avatar_icon = EXCLUDED.avatar_icon,
  default_model = EXCLUDED.default_model,
  assignee_user_id = EXCLUDED.assignee_user_id,
  capabilities = EXCLUDED.capabilities,
  updated_at = NOW();

-- =============================================================================
-- 5. Enable Realtime for agent_profiles
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE agent_profiles;

-- =============================================================================
-- 6. Updated_at trigger for agent_profiles
-- =============================================================================

CREATE OR REPLACE FUNCTION update_agent_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_profiles_updated_at
  BEFORE UPDATE ON agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_profiles_updated_at();
