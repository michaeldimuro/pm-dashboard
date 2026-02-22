-- Add Jarvis AI as a user and agent profile for Mission Control integration
-- Migration: 20260222_add_jarvis_agent.sql

-- =============================================================================
-- 1. Create Auth User for Jarvis
-- =============================================================================

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES (
  'b7c8d9e0-f1a2-4b3c-9d8e-7f6a5b4c3d2e',
  '00000000-0000-0000-0000-000000000000',
  'jarvis@jarvis-ai.local',
  crypt('agent-jarvis-nologin', gen_salt('bf')),
  NOW(),
  'authenticated',
  'authenticated',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. Create Public User (so Jarvis can be a task assignee)
-- =============================================================================

INSERT INTO users (id, email, full_name, businesses, created_at, updated_at)
VALUES (
  'b7c8d9e0-f1a2-4b3c-9d8e-7f6a5b4c3d2e',
  'jarvis@jarvis-ai.local',
  'Jarvis',
  ARRAY['capture_health', 'inspectable', 'synergy']::business_type[],
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 3. Create Agent Profile (for Operations Dashboard)
-- =============================================================================

INSERT INTO agent_profiles (agent_id, display_name, role, description, avatar_color, avatar_icon, default_model, status, assignee_user_id)
VALUES (
  'jarvis', 'Jarvis', 'Personal AI Assistant',
  'Telegram-first personal AI assistant with container-isolated agent execution.',
  '#10b981', 'bot', 'claude-haiku-4-5',
  'dormant', 'b7c8d9e0-f1a2-4b3c-9d8e-7f6a5b4c3d2e'
) ON CONFLICT (agent_id) DO NOTHING;
