/**
 * Agent Event Logger - Browser Version
 * Utility for logging activities from the browser to the Operations Room
 *
 * For Node.js agent code, import from a server-side module instead.
 * This module uses browser-compatible APIs (crypto.subtle, sessionStorage).
 *
 * Usage:
 * ```
 * import { logOperationEvent } from '@/lib/agentEventLogger'
 *
 * // Set credentials (typically done by app initialization)
 * setLoggerCredentials({
 *   agentId: 'agent:main:main',
 *   sessionId: 'uuid-here',
 *   loggerUrl: 'https://...',
 *   loggerSecret: 'secret-here'
 * })
 *
 * // Log events
 * await logOperationEvent({
 *   type: 'agent.session.started',
 *   payload: { ... }
 * })
 * ```
 */

/**
 * Generate a UUID v4 (browser-compatible)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Sign a message using HMAC-SHA256 (browser-compatible)
 */
async function signHMACSHA256(message: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (err) {
    console.error('[Logger] Signing error:', err);
    throw err;
  }
}

/**
 * Operation Event structure
 */
export interface OperationEventPayload {
  type: string;
  payload: Record<string, any>;
}

export interface OperationEvent extends OperationEventPayload {
  id: string;
  timestamp: string;
  agent_id: string;
  session_id: string;
}

/**
 * Logger credentials
 */
interface LoggerCredentials {
  agentId: string;
  sessionId: string;
  loggerUrl: string;
  loggerSecret: string;
}

let loggerConfig: LoggerCredentials | null = null;

/**
 * Set logger credentials
 * Called during app initialization with credentials from environment/auth
 */
export function setLoggerCredentials(credentials: LoggerCredentials): void {
  loggerConfig = credentials;
  console.log('[Logger] Credentials configured:', {
    agentId: credentials.agentId,
    sessionId: credentials.sessionId.substring(0, 8) + '...',
    url: credentials.loggerUrl,
  });
}

/**
 * Get current logger configuration
 */
export function getLoggerConfig(): LoggerCredentials | null {
  return loggerConfig;
}

/**
 * Log an operation event
 * Automatically signs the request and sends it to the logging webhook
 */
export async function logOperationEvent(
  event: OperationEventPayload
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    // Get credentials
    if (!loggerConfig) {
      console.warn('[Logger] Not configured - skipping event log');
      return { success: false, error: 'Logger not configured' };
    }

    const { agentId, sessionId, loggerUrl, loggerSecret } = loggerConfig;

    // Build event
    const fullEvent: OperationEvent = {
      id: `evt-${event.type}-${generateUUID()}`,
      type: event.type,
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      session_id: sessionId,
      payload: event.payload,
    };

    // Build request body
    const requestBody = JSON.stringify({
      event: fullEvent,
      timestamp: Date.now(),
    });

    // Sign the request
    const signature = await signHMACSHA256(requestBody, loggerSecret);

    // Send to logging webhook
    console.log(`[Logger] Logging event: ${event.type}`);

    const response = await fetch(loggerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = (errorData as any).error || response.statusText;
      console.error(`[Logger] Logging failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const result = await response.json();
    console.log(`[Logger] Event logged: ${fullEvent.id}`);

    return { success: true, eventId: fullEvent.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Logger] Logging error: ${message}`);
    return { success: false, error: message };
  }
}

/**
 * Convenience methods for common event types
 */

export async function logSessionStart(
  agentName: string,
  agentType: 'main' | 'subagent' = 'main',
  initialTask?: string,
  channel?: string
) {
  return logOperationEvent({
    type: 'agent.session.started',
    payload: {
      agent_name: agentName,
      agent_type: agentType,
      initial_task: initialTask,
      channel: channel || 'system',
      metadata: { version: '1.0' },
    },
  });
}

export async function logSessionEnd(summary: string, status: 'completed' | 'failed' = 'completed') {
  return logOperationEvent({
    type: 'agent.session.terminated',
    payload: {
      status,
      summary,
      total_duration_ms: Date.now(),
    },
  });
}

export async function logSubagentSpawned(
  subagentId: string,
  subagentName: string,
  assignedTask: string,
  parentSessionId?: string
) {
  return logOperationEvent({
    type: 'subagent.spawned',
    payload: {
      subagent_id: subagentId,
      subagent_name: subagentName,
      assigned_task: assignedTask,
      status: 'active',
      parent_session_id: parentSessionId,
      started_at: new Date().toISOString(),
    },
  });
}

export async function logSubagentCompleted(
  subagentName: string,
  summary: string,
  deliverables: string[] = []
) {
  return logOperationEvent({
    type: 'subagent.completed',
    payload: {
      status: 'completed',
      result: 'SUCCESS',
      summary,
      deliverables,
      total_duration_ms: Date.now(),
    },
  });
}

export async function logTaskStateChange(
  taskId: string,
  oldState: string,
  newState: string,
  taskTitle: string,
  priority?: string
) {
  return logOperationEvent({
    type: 'task.state_changed',
    payload: {
      task_id: taskId,
      old_state: oldState,
      new_state: newState,
      title: taskTitle,
      priority: priority || 'medium',
      transition_reason: 'Task status updated by agent',
    },
  });
}

export async function logWorkActivity(
  activityType: 'tool_execution' | 'message' | 'task_update' | 'other',
  toolName?: string,
  status?: 'started' | 'completed' | 'failed',
  result?: string,
  durationMs?: number
) {
  return logOperationEvent({
    type: 'agent.work_activity',
    payload: {
      activity_type: activityType,
      tool_name: toolName,
      status: status || 'completed',
      result,
      duration_ms: durationMs || 0,
    },
  });
}

export async function logStatusUpdate(
  status: 'active' | 'idle' | 'working' | 'waiting',
  progress?: number,
  currentTask?: string,
  estimatedCompletion?: string
) {
  return logOperationEvent({
    type: 'agent.status_updated',
    payload: {
      status,
      progress_percent: progress || 0,
      current_task: currentTask,
      last_activity: new Date().toISOString(),
      estimated_completion: estimatedCompletion,
    },
  });
}

export async function logError(
  severity: 'warning' | 'error' | 'critical',
  errorType: string,
  message: string,
  context?: Record<string, any>
) {
  return logOperationEvent({
    type: 'agent.error',
    payload: {
      severity,
      error_type: errorType,
      message,
      context: context || {},
    },
  });
}
