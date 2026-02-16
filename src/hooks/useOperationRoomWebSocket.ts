/**
 * Operations Room WebSocket Hook
 * Manages real-time connection to operations gateway
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperationsStore } from './useOperationsStore';
import type { OperationEvent } from '@/types/operations';

const WS_URL = process.env.VITE_OPROOM_WS_URL || 'wss://api.dashboard.michaeldimuro.com/api/realtime';
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_DELAY_MS);
  const [isConnected, setIsConnected] = useState(false);

  const addEvent = useOperationsStore((state) => state.addEvent);
  const updateMainAgent = useOperationsStore((state) => state.updateMainAgent);
  const addSubAgent = useOperationsStore((state) => state.addSubAgent);
  const updateSubAgent = useOperationsStore((state) => state.updateSubAgent);

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
        const data = message.data as any;
        if (data.type === 'connected') {
          console.log('[WS] Welcome:', data.message);
        } else if (data.type === 'ping') {
          // Respond to ping
          sendMessage({ channel: '_system', action: 'ping' });
        }
        return;
      }

      // Operation events
      const payload = message.data as any;
      if (payload.event_type) {
        const event = payload as OperationEvent;
        console.log('[WS] Event received:', event.event_type);

        // Add to live feed
        addEvent(event);

        // Update state based on event type
        if (event.event_type === 'agent.session.started') {
          if (event.payload.agent_type === 'main') {
            updateMainAgent({
              status: 'active',
              currentTask: event.payload.initial_task,
              progress: 0,
              startedAt: new Date(event.timestamp),
            });
          }
        } else if (event.event_type === 'subagent.spawned') {
          addSubAgent({
            id: event.payload.subagent_id,
            name: event.payload.subagent_name,
            assignedTask: event.payload.assigned_task,
            status: 'spawned',
            progress: 0,
            startedAt: new Date(event.timestamp),
          });
        } else if (event.event_type === 'agent.status_updated') {
          if (event.payload.agent_type === 'main') {
            updateMainAgent({
              status: event.payload.status,
              progress: event.payload.progress_percent,
            });
          } else {
            updateSubAgent(event.agent_id, {
              status: event.payload.status,
              progress: event.payload.progress_percent,
            });
          }
        } else if (event.event_type === 'task.state_changed') {
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
