-- ============================================================================
-- Operations Room - Database Schema Migration
-- Timestamp: 2026-02-16
-- Description: Create tables for real-time agent activity tracking
-- ============================================================================

-- ============================================================================
-- 1. Agent Sessions Table
-- Tracks active agents (main + sub-agents) and their lifecycle
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL UNIQUE,
  
  -- Identity
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('main', 'subagent')),
  parent_session_id UUID REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
  
  -- Status & Timing
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'active', 'idle', 'terminated')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE,
  terminated_at TIMESTAMP WITH TIME ZONE,
  
  -- Context
  channel TEXT,
  assigned_task TEXT,
  assigned_task_id UUID,
  
  -- For Operations Room Display
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  estimated_completion TIMESTAMP WITH TIME ZONE,
  summary TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_sessions_agent_id ON agent_sessions(agent_id);
CREATE INDEX idx_agent_sessions_session_id ON agent_sessions(session_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status);
CREATE INDEX idx_agent_sessions_parent ON agent_sessions(parent_session_id) WHERE parent_session_id IS NOT NULL;
CREATE INDEX idx_agent_sessions_created ON agent_sessions(created_at DESC);

-- ============================================================================
-- 2. Operations Events Table
-- Immutable event log - source of truth for all agent activities
-- ============================================================================

CREATE TABLE IF NOT EXISTS operations_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  
  -- Event metadata
  event_type TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  session_id UUID REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
  
  -- Immutable payload
  payload JSONB NOT NULL,
  
  -- Timing
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Audit
  created_by_user_id UUID
);

CREATE INDEX idx_operations_events_event_type ON operations_events(event_type);
CREATE INDEX idx_operations_events_agent_id ON operations_events(agent_id);
CREATE INDEX idx_operations_events_session_id ON operations_events(session_id);
CREATE INDEX idx_operations_events_triggered_at ON operations_events(triggered_at DESC);
CREATE INDEX idx_operations_events_created_at ON operations_events(created_at DESC);

-- ============================================================================
-- 3. Agent Activities Table
-- Log every tool execution and action for detailed audit trail
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  
  -- Activity type
  activity_type TEXT NOT NULL,
  tool_name TEXT,
  status TEXT CHECK (status IN ('started', 'completed', 'failed')),
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INT,
  
  -- Details
  description TEXT,
  context JSONB,
  result TEXT,
  error_message TEXT,
  
  -- Metadata
  token_cost INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_activities_session_id ON agent_activities(session_id);
CREATE INDEX idx_agent_activities_agent_id ON agent_activities(agent_id);
CREATE INDEX idx_agent_activities_activity_type ON agent_activities(activity_type);
CREATE INDEX idx_agent_activities_created_at ON agent_activities(created_at DESC);

-- ============================================================================
-- 4. Subagent Registry Table
-- Track spawned sub-agents and their lineage
-- ============================================================================

CREATE TABLE IF NOT EXISTS subagent_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL UNIQUE,
  
  -- Hierarchy
  parent_agent_id TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
  parent_session_id UUID REFERENCES agent_sessions(session_id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  assigned_task TEXT,
  task_id UUID,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'spawned', 'active', 'idle', 'working', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Performance
  progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  estimated_completion TIMESTAMP WITH TIME ZONE,
  
  -- Output
  summary TEXT,
  deliverables TEXT[],
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subagent_registry_agent_id ON subagent_registry(agent_id);
CREATE INDEX idx_subagent_registry_parent_agent_id ON subagent_registry(parent_agent_id);
CREATE INDEX idx_subagent_registry_session_id ON subagent_registry(session_id);
CREATE INDEX idx_subagent_registry_status ON subagent_registry(status);

-- ============================================================================
-- 5. Enable Postgres Realtime for operations_events
-- Required for Supabase Realtime to broadcast changes
-- ============================================================================

ALTER TABLE operations_events REPLICA IDENTITY FULL;
ALTER TABLE agent_sessions REPLICA IDENTITY FULL;

-- Enable replication for the tables (Supabase handles this automatically)
-- but we explicitly mark them for real-time subscriptions

-- ============================================================================
-- 6. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operations_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE subagent_registry ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow authenticated users to read all operations
CREATE POLICY "Allow users to read operations_events" 
  ON operations_events 
  FOR SELECT 
  TO authenticated 
  USING (TRUE);

CREATE POLICY "Allow users to read agent_sessions"
  ON agent_sessions
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow users to read agent_activities"
  ON agent_activities
  FOR SELECT
  TO authenticated
  USING (TRUE);

CREATE POLICY "Allow users to read subagent_registry"
  ON subagent_registry
  FOR SELECT
  TO authenticated
  USING (TRUE);

-- RLS Policy: Allow service role to insert events (via webhook)
CREATE POLICY "Allow service role to insert events"
  ON operations_events
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Allow service role to insert sessions"
  ON agent_sessions
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Allow service role to insert activities"
  ON agent_activities
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

CREATE POLICY "Allow service role to insert registry"
  ON subagent_registry
  FOR INSERT
  TO service_role
  WITH CHECK (TRUE);

-- RLS Policy: Allow service role to update sessions
CREATE POLICY "Allow service role to update sessions"
  ON agent_sessions
  FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY "Allow service role to update registry"
  ON subagent_registry
  FOR UPDATE
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ============================================================================
-- 7. Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agent_sessions_updated_at
  BEFORE UPDATE ON agent_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subagent_registry_updated_at
  BEFORE UPDATE ON subagent_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration Complete
-- ============================================================================
