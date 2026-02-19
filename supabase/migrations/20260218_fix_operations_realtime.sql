-- Fix Operations Realtime & FK Constraints
-- Migration: 20260218_fix_operations_realtime.sql
--
-- Issues fixed:
-- 1. operations_events.session_id had FK to agent_sessions - events couldn't be
--    inserted without a pre-existing session row (hook sends run IDs directly)
-- 2. operations_events and agent_sessions were NOT added to supabase_realtime
--    publication, so Realtime subscriptions never received any changes
-- 3. session_id type changed from UUID to TEXT since agent run IDs are strings

-- =============================================================================
-- 1. Drop FK constraint and change session_id to TEXT
-- =============================================================================

-- Drop the FK constraint on operations_events.session_id
ALTER TABLE operations_events DROP CONSTRAINT IF EXISTS operations_events_session_id_fkey;

-- Change session_id from UUID to TEXT (run IDs from hooks are strings)
ALTER TABLE operations_events ALTER COLUMN session_id TYPE TEXT USING session_id::TEXT;

-- =============================================================================
-- 2. Enable Supabase Realtime publication for operations tables
-- =============================================================================

-- Add tables to the Realtime publication so postgres_changes subscriptions work
-- (agent_profiles was already added in 20260218_agent_profiles_and_metrics.sql)

DO $$
BEGIN
  -- Check if operations_events is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'operations_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE operations_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'agent_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE agent_sessions;
  END IF;
END $$;
