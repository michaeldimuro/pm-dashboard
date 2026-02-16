/**
 * Operations Room WebSocket Hook
 * Manages real-time connection to operations gateway
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationsStore } from '../stores/operationsStore';
import type { OperationEvent, SubAgent } from '@/types/operations';

const WS_URL = import.meta.env.VITE_OPROOM_WS_URL || 'wss://api.dashboard.michaeldimuro.com/api/realtime';
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

interface WebSocketMessage {
  channel: string;
  message_id: string;
  timestamp: string;
  data: unknown;
}

export function useOperationRoomWebSocket() {
  const { session } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
  const [isConnected, setIsConnected] = useState(false);

  // Get store directly instead of trying to call it as a function
  const store = useOperationsStore();
  const addEvent = store.addEvent;
  const updateMainAgent = store.updateMainAgent;
  const addSubAgent = store.addSubAgent;
  const updateSubAgent = store.updateSubAgent;

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    if (!session?.access_token) {
      console.warn('[WS] No session, skipping connection');
      return;
    }

    try {
      console.log('[WS] Connecting...');
      const token = session.access_token;
      const url = `${WS_URL}?token=${encodeURIComponent(token)}`;

      wsRef.current = new WebSocket(url);

      wsRef.current.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        reconnectDelayRef.current = RECONNECT_DELAY_MS;

        // Subscribe to channels
        sendMessage({
          channel: 'operations_room',
          action: 'subscribe',
        });
        sendMessage({
          channel: 'agent_sessions',
          action: 'subscribe',
        });
      };

      wsRef.current.onmessage = (event: MessageEvent<string>) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          handleMessage(message);
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      wsRef.current.onerror = (err) => {
        console.error('[WS] Error:', err);
      };

      wsRef.current.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect with exponential backoff
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = Math.min(reconnectDelayRef.current, MAX_RECONNECT_DELAY_MS);
        console.log(`[WS] Reconnecting in ${delay}ms...`);

        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(
            reconnectDelayRef.current * 2,
            MAX_RECONNECT_DELAY_MS
          );
          connect();
        }, delay);
      };
    } catch (err) {
      console.error('[WS] Connection error:', err);
      setIsConnected(false);
    }
  }, [session?.access_token]);

  /**
   * Send a message through the WebSocket
   */
  const sendMessage = useCallback(
    (message: {
      channel: string;
      action?: string;
      data?: unknown;
    }) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('[WS] Not connected, cannot send message');
        return;
      }

      wsRef.current.send(
        JSON.stringify({
          ...message,
          message_id: `${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
        })
      );
    },
    []
  );

  /**
   * Handle incoming message
   */
  const handleMessage = useCallback(
    (message: WebSocketMessage) => {
      // System messages
      if (message.channel === '_system') {
        const data = message.data as Record<string, unknown>;
        if (data.type === 'connected') {
          console.log('[WS] Welcome:', data.message);
        } else if (data.type === 'ping') {
          // Respond to ping
          sendMessage({ channel: '_system', action: 'ping' });
        }
        return;
      }

      // Operation events
      const payload = message.data as Record<string, unknown>;
      if (payload.type) {
        const event = payload as unknown as OperationEvent;
        console.log('[WS] Event received:', event.type);

        // Add to live feed
        addEvent(event);

        // Update state based on event type
        if (event.type === 'agent.session.started') {
          const eventPayload = event.payload as Record<string, unknown>;
          if (eventPayload.agent_type === 'main') {
            updateMainAgent({
              status: 'active',
              currentTask: (eventPayload.initial_task as string) || '',
              progress: 0,
              startedAt: new Date(event.timestamp),
            });
          }
        } else if (event.type === 'subagent.spawned') {
          const eventPayload = event.payload as Record<string, unknown>;
          const subAgent: SubAgent = {
            id: (eventPayload.subagent_id as string) || '',
            name: (eventPayload.subagent_name as string) || '',
            currentTask: (eventPayload.assigned_task as string) || '',
            status: 'spawned',
            progress: 0,
            startedAt: new Date(event.timestamp),
            lastActivityAt: new Date(event.timestamp),
            parentSessionId: event.session_id || '',
            sessionId: (eventPayload.session_id as string) || '',
          };
          addSubAgent(subAgent);
        } else if (event.type === 'agent.status_updated') {
          const eventPayload = event.payload as Record<string, unknown>;
          if (eventPayload.agent_type === 'main') {
            updateMainAgent({
              status: eventPayload.status as 'active' | 'idle' | 'working' | 'waiting',
              progress: (eventPayload.progress_percent as number) || 0,
            });
          } else {
            updateSubAgent(event.agent_id, {
              status: eventPayload.status as 'spawned' | 'active' | 'idle' | 'working' | 'completed' | 'failed',
              progress: (eventPayload.progress_percent as number) || 0,
            });
          }
        } else if (event.type === 'task.state_changed') {
          // Task state changes will update the task flow store
          // This is handled by useTaskFlow hook
        }
      }
    },
    [addEvent, updateMainAgent, addSubAgent, updateSubAgent, sendMessage]
  );

  /**
   * Setup connection on mount
   */
  useEffect(() => {
    if (session?.access_token) {
      connect();
    }

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [session?.access_token, connect]);

  return {
    isConnected,
    sendMessage,
  };
}
