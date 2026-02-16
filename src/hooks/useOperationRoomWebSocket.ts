/**
 * Operations Room WebSocket Hook
 * SIMPLIFIED VERSION - No WebSocket backend needed, just mock data for UI
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Simplified - no WebSocket connection, just return mock state
const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function useOperationRoomWebSocket() {
  const { session } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Simplified - just simulate "connected" state for UI
  useEffect(() => {
    console.log('[OperationsRoom] Mock connection (no backend yet)');
    // Simulate connection after a brief delay
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 500);

    return () => {
      clearTimeout(timer);
      setIsConnected(false);
    };
  }, [session]);

  return {
    isConnected,
    sendMessage: () => {
      console.log('[OperationsRoom] sendMessage called (no-op, no backend)');
    },
  };
}
