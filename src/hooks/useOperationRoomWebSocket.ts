/**
 * Operations Room WebSocket Hook
 * Now uses Supabase Realtime instead of custom WebSocket
 */

import { useSupabaseRealtime } from './useSupabaseRealtime';

/**
 * Hook for Operations Room realtime connection
 * Wraps useSupabaseRealtime to maintain backwards compatibility
 */
export function useOperationRoomWebSocket() {
  const { isConnected, error } = useSupabaseRealtime();

  return {
    isConnected,
    error,
    sendMessage: () => {
      // No-op - events are logged via API endpoint
      console.log('[OperationsRoom] sendMessage called (use API endpoint instead)');
    },
  };
}
