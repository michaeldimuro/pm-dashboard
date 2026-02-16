/**
 * Agent Event Logger
 * Utility for agents to log their activities to the Operations Room
 *
 * Usage (in any agent code):
 * ```
 * import { logOperationEvent } from '@/lib/agentEventLogger'
 *
 * await logOperationEvent({
 *   type: 'agent.session.started',
 *   payload: { ... }
 * })
 * ```
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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
 * Log an operation event
 * Automatically signs the request and sends it to the logging webhook
 */
export async function logOperationEvent(
  event: OperationEventPayload
): Promise<{ success: boolean; error?: string; eventId?: string }> {
  try {
    // Get environment variables
    const agentId = process.env.AGENT_ID;
    const sessionId = process.env.SESSION_ID;
    const loggerUrl = process.env.OPERATION_LOGGER_URL;
    const loggerSecret = process.env.OPERATION_LOGGER_SECRET;

    // Validate required env vars
    if (!agentId || !sessionId || !loggerUrl || !loggerSecret) {
      console.warn('[Agent] Missing operation logger environment variables');
      console.warn(`  AGENT_ID: ${agentId ? '✓' : '✗'}`);
      console.warn(`  SESSION_ID: ${sessionId ? '✓' : '✗'}`);
      console.warn(`  OPERATION_LOGGER_URL: ${loggerUrl ? '✓' : '✗'}`);
      console.warn(`  OPERATION_LOGGER_SECRET: ${loggerSecret ? '✓' : '✗'}`);
      return { success: false, error: 'Operation logger not configured' };
    }

    // Build event
    const fullEvent: OperationEvent = {
      id: `evt-${event.type}-${uuidv4()}`,
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
    const signature = crypto
      .createHmac('sha256', loggerSecret)
      .update(requestBody)
      .digest('hex');

    // Send to logging webhook
    console.log(`[Agent] Logging event: ${event.type}`);

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
      const errorMsg = errorData.error || response.statusText;
      console.error(`[Agent] Logging failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const result = await response.json();
    console.log(`[Agent] Event logged: ${fullEvent.id}`);

    return { success: true, eventId: fullEvent.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Agent] Logging error: ${message}`);
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
