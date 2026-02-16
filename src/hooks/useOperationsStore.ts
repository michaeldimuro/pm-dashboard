/**
 * useOperationsStore - Hook to access the operations store
 * Convenience wrapper for common store patterns
 */

import {
  useOperationsStore as useStore,
  useMainAgent,
  useSubAgents,
  useTaskFlow,
  useLiveFeed,
  useConnectionStatus,
  useSubAgentCount,
  useActiveSubAgents,
  useCompletedSubAgents,
} from '../stores/operationsStore';
import type {
  Agent,
  SubAgent,
  TaskFlow,
  OperationEvent,
} from '../types/operations';

/**
 * Main hook for accessing operations store
 * Returns both state and actions
 */
export const useOperationsStore = () => {
  const store = useStore();
  
  return {
    // State accessors
    mainAgent: store.mainAgent,
    subAgents: store.subAgents,
    taskFlow: store.taskFlow,
    liveFeed: store.liveFeed,
    isConnected: store.isConnected,
    connectionError: store.connectionError,
    unseenEventCount: store.unseenEventCount,
    lastEventAt: store.lastEventAt,
    sessionStartedAt: store.sessionStartedAt,
    
    // Actions
    addEvent: store.addEvent,
    updateMainAgent: store.updateMainAgent,
    addSubAgent: store.addSubAgent,
    updateSubAgent: store.updateSubAgent,
    removeSubAgent: store.removeSubAgent,
    updateTaskFlow: store.updateTaskFlow,
    setConnected: store.setConnected,
    clearEvents: store.clearEvents,
  };
};

/**
 * Selector hooks for specific parts of state
 */
export const useOperations = {
  mainAgent: useMainAgent,
  subAgents: useSubAgents,
  taskFlow: useTaskFlow,
  liveFeed: useLiveFeed,
  connectionStatus: useConnectionStatus,
  subAgentCount: useSubAgentCount,
  activeSubAgents: useActiveSubAgents,
  completedSubAgents: useCompletedSubAgents,
};
