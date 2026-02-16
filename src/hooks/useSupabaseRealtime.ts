/**
 * Supabase Realtime Hook for Operations Room
 * Subscribes to real-time changes in agent_sessions and operations_events
 */

import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useOperationsStore } from '@/stores/operationsStore';
import type { OperationEvent, SubAgent, Agent } from '@/types/operations';

interface AgentSessionRow {
  id: string;
  agent_id: string;
  session_id: string;
  agent_name: string;
  agent_type: 'main' | 'subagent';
  parent_session_id: string | null;
  status: string;
  started_at: string;
  last_activity_at: string | null;
  terminated_at: string | null;
  channel: string | null;
  assigned_task: string | null;
  assigned_task_id: string | null;
  progress_percent: number;
  estimated_completion: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface OperationsEventRow {
  id: string;
  event_id: string;
  event_type: string;
  agent_id: string;
  session_id: string | null;
  payload: Record<string, unknown>;
  triggered_at: string;
  created_at: string;
  created_by_user_id: string | null;
}

/**
 * Convert DB row to Agent type
 */
function rowToAgent(row: AgentSessionRow): Agent {
  return {
    id: row.agent_id,
    name: row.agent_name,
    status: mapDbStatusToAgentStatus(row.status),
    currentTask: row.assigned_task || '',
    progress: row.progress_percent || 0,
    startedAt: new Date(row.started_at),
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : new Date(),
    estimatedCompletion: row.estimated_completion ? new Date(row.estimated_completion) : undefined,
  };
}

/**
 * Convert DB row to SubAgent type
 */
function rowToSubAgent(row: AgentSessionRow): SubAgent {
  return {
    id: row.agent_id,
    name: row.agent_name,
    status: mapDbStatusToSubAgentStatus(row.status),
    currentTask: row.assigned_task || '',
    assignedTask: row.assigned_task || '',
    progress: row.progress_percent || 0,
    startedAt: new Date(row.started_at),
    lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at) : new Date(),
    estimatedCompletion: row.estimated_completion ? new Date(row.estimated_completion) : undefined,
    parentSessionId: row.parent_session_id || '',
    sessionId: row.session_id,
    completedAt: row.terminated_at ? new Date(row.terminated_at) : undefined,
    summary: row.summary || undefined,
  };
}

/**
 * Convert DB row to OperationEvent type
 */
function rowToEvent(row: OperationsEventRow): OperationEvent {
  return {
    id: row.event_id,
    type: row.event_type,
    timestamp: row.triggered_at,
    agent_id: row.agent_id,
    session_id: row.session_id || undefined,
    payload: row.payload,
  };
}

/**
 * Map database status to Agent status
 */
function mapDbStatusToAgentStatus(dbStatus: string): 'active' | 'idle' | 'working' | 'waiting' {
  switch (dbStatus) {
    case 'active':
      return 'active';
    case 'working':
      return 'working';
    case 'idle':
      return 'idle';
    case 'initiated':
    case 'terminated':
    default:
      return 'idle';
  }
}

/**
 * Map database status to SubAgent status
 */
function mapDbStatusToSubAgentStatus(dbStatus: string): 'spawned' | 'active' | 'idle' | 'working' | 'completed' | 'failed' {
  switch (dbStatus) {
    case 'initiated':
      return 'spawned';
    case 'active':
      return 'active';
    case 'working':
      return 'working';
    case 'idle':
      return 'idle';
    case 'terminated':
      return 'completed';
    default:
      return 'idle';
  }
}

// Module-level flag to track if data has been fetched
let dataFetched = false;
let channelInstance: RealtimeChannel | null = null;

/**
 * Fetch initial data and set up realtime subscriptions (runs once globally)
 */
async function initializeOperationsData() {
  if (dataFetched) {
    console.log('[SupabaseRealtime] Data already fetched, skipping');
    return;
  }
  
  console.log('[SupabaseRealtime] Initializing and fetching data...');
  dataFetched = true;
  
  const store = useOperationsStore.getState();

  try {
    // Fetch active agent sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('agent_sessions')
      .select('*')
      .in('status', ['initiated', 'active', 'idle'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (sessionsError) {
      console.error('[SupabaseRealtime] Error fetching sessions:', sessionsError);
    } else if (sessions) {
      console.log(`[SupabaseRealtime] Loaded ${sessions.length} sessions`);
      
      sessions.forEach((row: AgentSessionRow) => {
        if (row.agent_type === 'main') {
          store.updateMainAgent(rowToAgent(row));
        } else {
          store.addSubAgent(rowToSubAgent(row));
        }
      });
    }

    // Fetch recent events
    const { data: events, error: eventsError } = await supabase
      .from('operations_events')
      .select('*')
      .order('triggered_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      console.error('[SupabaseRealtime] Error fetching events:', eventsError);
    } else if (events) {
      console.log(`[SupabaseRealtime] Loaded ${events.length} events`);
      
      // Add events in reverse order (oldest first) so newest appears at top
      [...events].reverse().forEach((row: OperationsEventRow) => {
        store.addEvent(rowToEvent(row));
      });
    }
    
    // Set connected status
    store.setConnected(true, null);
    
  } catch (err) {
    console.error('[SupabaseRealtime] Exception fetching initial data:', err);
    store.setConnected(false, String(err));
  }

  // Set up realtime subscriptions
  setupRealtimeSubscriptions();
}

/**
 * Set up Supabase Realtime subscriptions
 */
function setupRealtimeSubscriptions() {
  if (channelInstance) {
    console.log('[SupabaseRealtime] Channel already exists');
    return;
  }

  console.log('[SupabaseRealtime] Setting up realtime subscriptions...');

  const channel = supabase
    .channel('operations-room')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_sessions',
      },
      (payload) => handleSessionChange(payload as any)
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'operations_events',
      },
      (payload) => handleEventChange(payload as any)
    )
    .subscribe((status, err) => {
      console.log('[SupabaseRealtime] Subscription status:', status, err);
      
      const store = useOperationsStore.getState();
      if (status === 'SUBSCRIBED') {
        store.setConnected(true, null);
        console.log('[SupabaseRealtime] Connected successfully');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        store.setConnected(false, err?.message || 'Connection failed');
        console.error('[SupabaseRealtime] Connection error:', err);
      }
    });

  channelInstance = channel;
}

/**
 * Handle agent_sessions changes
 */
function handleSessionChange(payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: AgentSessionRow;
  old: AgentSessionRow | null;
}) {
  console.log('[SupabaseRealtime] Session change:', payload.eventType, payload.new?.agent_name);

  const row = payload.new;
  if (!row) return;

  const store = useOperationsStore.getState();

  if (payload.eventType === 'DELETE' || row.status === 'terminated') {
    if (row.agent_type === 'main') {
      store.updateMainAgent({ status: 'idle' });
    } else {
      store.updateSubAgent(row.agent_id, {
        status: row.status === 'terminated' ? 'completed' : 'idle',
        completedAt: row.terminated_at ? new Date(row.terminated_at) : undefined,
        summary: row.summary || undefined,
      });
    }
  } else if (payload.eventType === 'INSERT') {
    if (row.agent_type === 'main') {
      store.updateMainAgent(rowToAgent(row));
    } else {
      store.addSubAgent(rowToSubAgent(row));
    }
  } else if (payload.eventType === 'UPDATE') {
    if (row.agent_type === 'main') {
      store.updateMainAgent(rowToAgent(row));
    } else {
      store.updateSubAgent(row.agent_id, rowToSubAgent(row));
    }
  }
}

/**
 * Handle operations_events changes
 */
function handleEventChange(payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: OperationsEventRow;
  old: OperationsEventRow | null;
}) {
  console.log('[SupabaseRealtime] Event change:', payload.eventType, payload.new?.event_type);

  if (payload.eventType === 'INSERT' && payload.new) {
    const store = useOperationsStore.getState();
    store.addEvent(rowToEvent(payload.new));
  }
}

/**
 * Main hook for Supabase Realtime subscriptions
 * This hook just triggers initialization - actual data management is global
 */
export function useSupabaseRealtime() {
  const [initialized, setInitialized] = useState(dataFetched);
  
  // Get store state for return value
  const isConnected = useOperationsStore((state) => state.isConnected);
  const connectionError = useOperationsStore((state) => state.connectionError);

  useEffect(() => {
    // Initialize data on first mount (globally)
    if (!dataFetched) {
      initializeOperationsData().then(() => {
        setInitialized(true);
      });
    }
    
    // No cleanup needed - data and subscriptions persist
  }, []);

  return {
    isConnected,
    error: connectionError,
    initialized,
  };
}

/**
 * Utility to log an event to the operations_events table
 */
export async function logOperationEvent(event: {
  event_id: string;
  event_type: string;
  agent_id: string;
  session_id?: string;
  payload: Record<string, unknown>;
  triggered_at?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('operations_events')
      .insert([
        {
          event_id: event.event_id,
          event_type: event.event_type,
          agent_id: event.agent_id,
          session_id: event.session_id || null,
          payload: event.payload,
          triggered_at: event.triggered_at || new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error('[logOperationEvent] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[logOperationEvent] Exception:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Utility to create/update an agent session
 */
export async function upsertAgentSession(session: {
  agent_id: string;
  session_id: string;
  agent_name: string;
  agent_type: 'main' | 'subagent';
  parent_session_id?: string;
  status?: string;
  channel?: string;
  assigned_task?: string;
  progress_percent?: number;
  summary?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('agent_sessions')
      .upsert(
        {
          agent_id: session.agent_id,
          session_id: session.session_id,
          agent_name: session.agent_name,
          agent_type: session.agent_type,
          parent_session_id: session.parent_session_id || null,
          status: session.status || 'active',
          channel: session.channel,
          assigned_task: session.assigned_task,
          progress_percent: session.progress_percent || 0,
          summary: session.summary,
          last_activity_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id',
        }
      );

    if (error) {
      console.error('[upsertAgentSession] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('[upsertAgentSession] Exception:', err);
    return { success: false, error: String(err) };
  }
}
