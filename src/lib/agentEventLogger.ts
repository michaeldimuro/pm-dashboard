/**
 * Agent Event Logger
 * Universal logging function for agents to report activities to Operations Room
 *
 * Usage in agent code:
 * ```typescript
 * await logOperationEvent({
 *   type: 'agent.work_activity',
 *   payload: {
 *     session_id: process.env.SESSION_ID,
 *     activity_type: 'tool_execution',
 *     tool_name: 'write',
 *     status: 'completed',
 *     result: 'File created successfully'
 *   }
 * })
 * ```
 */

import { v4 as uuidv4 } from 'uuid';

export interface OperationEventInput {
  type: string;
  payload: Record<string, any>;
  triggered_by?: 'user' | 'system' | 'webhook' | 'timer';
  correlation_id?: string;
}

export interface OperationEventPayload {
  id: string;
  type: string;
  timestamp: string;
  agent_id: string;
  session_id?: string;
  payload: Record<string, any>;
  triggered_by?: 'user' | 'system' | 'webhook' | 'timer';
  correlation_id?: string;
}

/**
 * Log an operation event to the Operations Room backend
 * Can be called from agent code or browser
 *
 * @param event The operation event to log
 * @returns Promise<void>
 * @throws Error if logging fails
 */
export async function logOperationEvent(event: OperationEventInput): Promise<void> {
  try {
    const payload: OperationEventPayload = {
      id: `evt-${event.type}-${uuidv4()}`,
      type: event.type,
      timestamp: new Date().toISOString(),
      agent_id: getAgentId(),
      session_id: getSessionId(),
      payload: event.payload,
      triggered_by: event.triggered_by,
      correlation_id: event.correlation_id,
    };

    const loggerUrl = getLoggerUrl();
    const secret = getLoggerSecret();

    if (!loggerUrl) {
      console.warn('[agentEventLogger] OPERATION_LOGGER_URL not configured, skipping event logging');
      return;
    }

    const response = await fetch(loggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret && { 'Authorization': `Bearer ${secret}` }),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`[agentEventLogger] Failed to log event: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[agentEventLogger] Error logging operation event:', error);
    // Don't throw - logging failure shouldn't interrupt agent work
  }
}

/**
 * Batch log multiple events
 * More efficient than calling logOperationEvent multiple times
 *
 * @param events Array of events to log
 * @returns Promise<void>
 */
export async function logOperationEventsBatch(events: OperationEventInput[]): Promise<void> {
  try {
    const payloads: OperationEventPayload[] = events.map((event) => ({
      id: `evt-${event.type}-${uuidv4()}`,
      type: event.type,
      timestamp: new Date().toISOString(),
      agent_id: getAgentId(),
      session_id: getSessionId(),
      payload: event.payload,
      triggered_by: event.triggered_by,
      correlation_id: event.correlation_id,
    }));

    const loggerUrl = getLoggerUrl();
    const secret = getLoggerSecret();

    if (!loggerUrl) {
      console.warn('[agentEventLogger] OPERATION_LOGGER_URL not configured, skipping batch logging');
      return;
    }

    const response = await fetch(loggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret && { 'Authorization': `Bearer ${secret}` }),
      },
      body: JSON.stringify({ batch: payloads }),
    });

    if (!response.ok) {
      console.error(`[agentEventLogger] Failed to log batch: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('[agentEventLogger] Error logging batch events:', error);
  }
}

/**
 * Get agent ID from environment
 * Tries multiple sources: process.env, import.meta.env, window
 */
function getAgentId(): string {
  // Browser
  if (typeof window !== 'undefined' && (window as any).AGENT_ID) {
    return (window as any).AGENT_ID;
  }

  // Vite environment
  if (typeof import !== 'undefined') {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_AGENT_ID) {
      return metaEnv.VITE_AGENT_ID;
    }
  }

  // Node.js environment
  if (typeof process !== 'undefined' && process.env?.AGENT_ID) {
    return process.env.AGENT_ID;
  }

  return 'unknown';
}

/**
 * Get session ID from environment
 */
function getSessionId(): string | undefined {
  // Browser
  if (typeof window !== 'undefined' && (window as any).SESSION_ID) {
    return (window as any).SESSION_ID;
  }

  // Vite environment
  if (typeof import !== 'undefined') {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_SESSION_ID) {
      return metaEnv.VITE_SESSION_ID;
    }
  }

  // Node.js environment
  if (typeof process !== 'undefined') {
    return process.env.SESSION_ID;
  }

  return undefined;
}

/**
 * Get operation logger URL from environment
 */
function getLoggerUrl(): string | undefined {
  // Browser / Vite
  if (typeof import !== 'undefined') {
    const metaEnv = (import.meta as any).env;
    if (metaEnv?.VITE_OPERATION_LOGGER_URL) {
      return metaEnv.VITE_OPERATION_LOGGER_URL;
    }
  }

  // Node.js
  if (typeof process !== 'undefined') {
    return process.env.OPERATION_LOGGER_URL;
  }

  return undefined;
}

/**
 * Get operation logger secret from environment
 * Note: This should only be available server-side, never expose to browser
 */
function getLoggerSecret(): string | undefined {
  // Only allow in Node.js environment (agent code)
  // Never expose client-side secrets
  if (typeof process !== 'undefined' && typeof window === 'undefined') {
    return process.env.OPERATION_LOGGER_SECRET;
  }

  return undefined;
}

/**
 * Convenience functions for common event types
 */

export async function logAgentSessionStarted(payload: any): Promise<void> {
  await logOperationEvent({
    type: 'agent.session.started',
    payload,
  });
}

export async function logSubAgentSpawned(payload: any): Promise<void> {
  await logOperationEvent({
    type: 'subagent.spawned',
    payload,
  });
}

export async function logTaskStateChanged(taskId: string, oldState: string, newState: string, metadata?: any): Promise<void> {
  await logOperationEvent({
    type: 'task.state_changed',
    payload: {
      task_id: taskId,
      old_state: oldState,
      new_state: newState,
      ...metadata,
    },
  });
}

export async function logAgentWorkActivity(activityType: string, toolName?: string, status?: string, result?: string): Promise<void> {
  await logOperationEvent({
    type: 'agent.work_activity',
    payload: {
      activity_type: activityType,
      tool_name: toolName,
      status,
      result,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logAgentStatusUpdate(status: string, progress?: number, estimatedCompletion?: string): Promise<void> {
  await logOperationEvent({
    type: 'agent.status_updated',
    payload: {
      status,
      progress,
      estimated_completion: estimatedCompletion,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logSubAgentCompleted(summary: string, deliverables?: string[]): Promise<void> {
  await logOperationEvent({
    type: 'subagent.completed',
    payload: {
      status: 'completed',
      summary,
      deliverables,
      timestamp: new Date().toISOString(),
    },
  });
}

export async function logAgentError(severity: 'error' | 'warning' | 'info', message: string, context?: any): Promise<void> {
  await logOperationEvent({
    type: 'agent.error',
    payload: {
      severity,
      message,
      context,
      timestamp: new Date().toISOString(),
    },
  });
}
