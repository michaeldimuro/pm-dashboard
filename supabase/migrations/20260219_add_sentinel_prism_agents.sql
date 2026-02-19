-- Add Sentinel (QA) and Prism (Marketing) agents
-- Migration: 20260219_add_sentinel_prism_agents.sql

-- =============================================================================
-- 1. Create Auth Users for Sentinel and Prism
-- =============================================================================

-- Sentinel auth user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
  '5e4d3c2b-a1b0-4c9d-8e7f-6a5b4c3d2e1f',
  '00000000-0000-0000-0000-000000000000',
  'sentinel@openclaw.local',
  crypt('agent-sentinel-nologin', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Prism auth user
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
  '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
  '00000000-0000-0000-0000-000000000000',
  'prism@openclaw.local',
  crypt('agent-prism-nologin', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Create Public Users (so agents can be task assignees)
-- =============================================================================

-- Sentinel public user
INSERT INTO users (id, email, full_name, businesses, created_at, updated_at)
VALUES (
  '5e4d3c2b-a1b0-4c9d-8e7f-6a5b4c3d2e1f',
  'sentinel@openclaw.local',
  'Sentinel',
  ARRAY['capture_health', 'inspectable', 'synergy']::business_type[],
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Prism public user
INSERT INTO users (id, email, full_name, businesses, created_at, updated_at)
VALUES (
  '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e',
  'prism@openclaw.local',
  'Prism',
  ARRAY['capture_health', 'inspectable', 'synergy']::business_type[],
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Create Agent Profiles (for Operations Dashboard)
-- =============================================================================

INSERT INTO agent_profiles (agent_id, display_name, role, description, avatar_color, avatar_icon, default_model, assignee_user_id, capabilities)
VALUES
  ('sentinel', 'Sentinel', 'Quality Assurance & Testing', 'Code review, test execution, regression testing, edge case validation, QA sign-off on completed work', '#06b6d4', 'shield', 'claude-haiku-4-5', '5e4d3c2b-a1b0-4c9d-8e7f-6a5b4c3d2e1f', ARRAY['code-review', 'testing', 'regression', 'qa-signoff']),
  ('prism', 'Prism', 'Marketing & Content Creation', 'Marketing copy, social media content, email campaigns, landing page content, competitive positioning', '#ec4899', 'megaphone', 'claude-haiku-4-5', '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5e', ARRAY['marketing', 'content', 'campaigns', 'social-media'])
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
