/**
 * useOperationRoomWebSocket - Manages WebSocket connection lifecycle
 * Handles connection, subscriptions, reconnection, and event dispatching
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage, OperationEvent } from '../types/operations';
import { useOperationsStore } from './useOperationsStore';

interface WebSocketConfig {
  url?: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url:
    process.env.VITE_OPROOM_WS_URL ||
    (typeof window !== 'undefined'
      ? `wss://${window.location.host}/api/realtime`
      : 'ws://localhost:3000/api/realtime'),
  reconnectAttempts: 5,
  reconnectDelay: 1000, // Start at 1s, double each time
  heartbeatInterval: 30000, // 30 seconds
};

/**
 * Hook for managing WebSocket connection and event subscription
 */
export const useOperationRoomWebSocket = (config: WebSocketConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageQueueRef = useRef<WebSocketMessage[]>([]);
  const messageIdSetRef = useRef<Set<string>>(new Set());
  
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);
  
  const {
    setConnected,
    addEvent,
    updateMainAgent,
    addSubAgent,
    removeSubAgent,
    updateSubAgent,
    updateTaskFlow,
  } = useOperationsStore();
  
  const [isReady, setIsReady] = useState(false);

  /**
   * Handle incoming WebSocket messages
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Deduplicate by message_id
        if (messageIdSetRef.current.has(message.message_id)) {
          return;
        }
        messageIdSetRef.current.add(message.message_id);
        // Keep set size bounded
        if (messageIdSetRef.current.size > 1000) {
          messageIdSetRef.current.clear();
        }
        
        // Handle array of events
        const events = Array.isArray(message.data)
          ? message.data
          : [message.data];
        
        events.forEach((operationEvent) => {
          handleOperationEvent(operationEvent);
        });
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    },
    []
  );

  /**
   * Handle specific operation event types
   */
  const handleOperationEvent = useCallback(
    (event: OperationEvent) => {
      // Always add to live feed
      addEvent(event);
      
      // Route by event type
      const { type, payload } = event;
      
      if (type === 'agent.session.started') {
        updateMainAgent({
          id: payload.agent_id,
          name: payload.agent_name,
          status: 'active',
          currentTask: payload.initial_task || '',
          progress: 0,
          startedAt: new Date(payload.started_at || new Date()),
        });
      } else if (type === 'agent.status_updated') {
        updateMainAgent({
          status: payload.status,
          currentTask: payload.current_task,
          progress: payload.progress_percent || 0,
          estimatedCompletion: payload.estimated_completion
            ? new Date(payload.estimated_completion)
            : undefined,
          lastActivityAt: new Date(),
        });
      } else if (type === 'subagent.spawned') {
        addSubAgent({
          id: payload.subagent_id,
          name: payload.subagent_name,
          status: 'spawned',
          currentTask: payload.assigned_task,
          progress: 0,
          parentSessionId: payload.session_id,
          sessionId: payload.session_id,
          startedAt: new Date(payload.started_at),
          lastActivityAt: new Date(),
        });
      } else if (type === 'agent.work_activity') {
        // Update the agent's last activity time
        const agentId = event.agent_id;
        if (agentId.includes('subagent')) {
          updateSubAgent(agentId, {
            lastActivityAt: new Date(),
          });
        } else {
          updateMainAgent({
            lastActivityAt: new Date(),
          });
        }
      } else if (type === 'agent.status_updated' && payload.status === 'working') {
        // Update progress if working
        if (event.agent_id.includes('subagent')) {
          updateSubAgent(event.agent_id, {
            status: 'working',
            progress: payload.progress_percent || 0,
          });
        } else {
          updateMainAgent({
            status: 'working',
            progress: payload.progress_percent || 0,
          });
        }
      } else if (type === 'subagent.completed') {
        updateSubAgent(event.agent_id, {
          status: 'completed',
          completedAt: new Date(),
          summary: payload.summary,
          deliverables: payload.deliverables,
          progress: 100,
        });
      } else if (type === 'subagent.failed') {
        updateSubAgent(event.agent_id, {
          status: 'failed',
          completedAt: new Date(),
          summary: payload.error_message || 'Task failed',
        });
      } else if (type === 'task.state_changed') {
        // Task flow updates will be handled by a separate service
        // This is just for logging to live feed
      }
    },
    [addEvent, updateMainAgent, addSubAgent, updateSubAgent]
  );

  /**
   * Connect to WebSocket with exponential backoff
   */
  const connect = useCallback(() => {
    if (isManuallyClosedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      const ws = new WebSocket(finalConfig.url);
      
      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        messageIdSetRef.current.clear();
        setIsReady(true);
        
        // Drain message queue
        while (messageQueueRef.current.length > 0) {
          const msg = messageQueueRef.current.shift();
          if (msg) ws.send(JSON.stringify(msg));
        }
        
        // Start heartbeat
        heartbeat();
      };
      
      ws.onmessage = handleMessage;
      
      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        setConnected(false, 'WebSocket error');
      };
      
      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setConnected(false);
        setIsReady(false);
        
        // Attempt reconnection with exponential backoff
        if (
          !isManuallyClosedRef.current &&
          reconnectAttemptsRef.current < finalConfig.reconnectAttempts
        ) {
          const delay =
            finalConfig.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`
          );
          reconnectAttemptsRef.current += 1;
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
      setConnected(false, 'Failed to create connection');
    }
  }, [finalConfig.url, finalConfig.reconnectAttempts, finalConfig.reconnectDelay, setConnected]);

  /**
   * Send heartbeat ping
   */
  const heartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString(),
        })
      );
    }
    
    heartbeatTimeoutRef.current = setTimeout(
      heartbeat,
      finalConfig.heartbeatInterval
    );
  }, [finalConfig.heartbeatInterval]);

  /**
   * Send a message (with queuing if not connected)
   */
  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      messageQueueRef.current.push(message);
      console.warn('[WebSocket] Not connected, message queued');
    }
  }, []);

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback(
    (channel: string, filters?: Record<string, string>) => {
      send({
        channel: channel as any,
        message_id: crypto.randomUUID?.() || Date.now().toString(),
        timestamp: new Date().toISOString(),
        data: {
          id: 'subscribe',
          type: 'system',
          timestamp: new Date().toISOString(),
          agent_id: 'client',
          payload: { channel, filters },
        },
      });
    },
    [send]
  );

  /**
   * Unsubscribe from a channel
   */
  const unsubscribe = useCallback(
    (channel: string) => {
      send({
        channel: channel as any,
        message_id: crypto.randomUUID?.() || Date.now().toString(),
        timestamp: new Date().toISOString(),
        data: {
          id: 'unsubscribe',
          type: 'system',
          timestamp: new Date().toISOString(),
          agent_id: 'client',
          payload: { channel },
        },
      });
    },
    [send]
  );

  /**
   * Close connection manually
   */
  const disconnect = useCallback(() => {
    isManuallyClosedRef.current = true;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnected(false);
    setIsReady(false);
  }, [setConnected]);

  /**
   * Reconnect (reset and try again)
   */
  const reconnect = useCallback(() => {
    disconnect();
    isManuallyClosedRef.current = false;
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  /**
   * Initialize connection on mount
   */
  useEffect(() => {
    connect();
    
    return () => {
      isManuallyClosedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    isReady,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
  };
};
