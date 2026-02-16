/**
 * Operations Room State Store
 * Zustand store for managing real-time agent activity state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  OperationsRoomState,
  Agent,
  SubAgent,
  Task,
  TaskFlow,
  OperationEvent,
  TaskStatus,
} from '../types/operations';

/**
 * Create the operations store
 */
export const useOperationsStore = create<OperationsRoomState>()(
  devtools(
    (set, get) => ({
      // Initial state
      mainAgent: null,
      subAgents: {},
      taskFlow: {
        backlog: [],
        todo: [],
        inProgress: [],
        review: [],
        done: [],
      },
      liveFeed: [],
      isConnected: false,
      connectionError: null,
      unseenEventCount: 0,
      
      /**
       * Add event to live feed (keep last 50)
       */
      addEvent: (event: OperationEvent) =>
        set((state) => {
          const newFeed = [event, ...state.liveFeed].slice(0, 50);
          return {
            liveFeed: newFeed,
            lastEventAt: new Date(),
            unseenEventCount: state.unseenEventCount + 1,
          };
        }, false, 'addEvent'),
      
      /**
       * Update main agent status
       */
      updateMainAgent: (updates: Partial<Agent>) =>
        set((state) => ({
          mainAgent: state.mainAgent
            ? {
                ...state.mainAgent,
                ...updates,
                lastActivityAt: updates.lastActivityAt || new Date(),
              }
            : {
                id: updates.id || 'unknown',
                name: updates.name || 'Agent',
                status: updates.status || 'idle',
                currentTask: updates.currentTask || '',
                progress: updates.progress || 0,
                startedAt: updates.startedAt || new Date(),
                lastActivityAt: new Date(),
                ...updates,
              },
        }), false, 'updateMainAgent'),
      
      /**
       * Add a new sub-agent
       */
      addSubAgent: (agent: SubAgent) =>
        set((state) => ({
          subAgents: {
            ...state.subAgents,
            [agent.id]: agent,
          },
        }), false, 'addSubAgent'),
      
      /**
       * Update an existing sub-agent
       */
      updateSubAgent: (id: string, updates: Partial<SubAgent>) =>
        set((state) => {
          const existing = state.subAgents[id];
          if (!existing) return state;
          
          return {
            subAgents: {
              ...state.subAgents,
              [id]: {
                ...existing,
                ...updates,
                lastActivityAt: updates.lastActivityAt || new Date(),
              },
            },
          };
        }, false, 'updateSubAgent'),
      
      /**
       * Remove a sub-agent
       */
      removeSubAgent: (id: string) =>
        set((state) => {
          const { [id]: _, ...rest } = state.subAgents;
          return { subAgents: rest };
        }, false, 'removeSubAgent'),
      
      /**
       * Update entire task flow (for kanban)
       */
      updateTaskFlow: (taskFlow: TaskFlow) =>
        set({ taskFlow }, false, 'updateTaskFlow'),
      
      /**
       * Update connection status
       */
      setConnected: (status: boolean, error: string | null = null) =>
        set(
          {
            isConnected: status,
            connectionError: error,
          },
          false,
          status ? 'connectionEstablished' : `connectionFailed: ${error}`
        ),
      
      /**
       * Clear all events from feed
       */
      clearEvents: () =>
        set({ liveFeed: [] }, false, 'clearEvents'),
    }),
    {
      name: 'operations-store',
      enabled: import.meta.env.DEV,
    }
  )
);

/**
 * Selector hooks for derived state
 */

export const useMainAgent = () =>
  useOperationsStore((state) => state.mainAgent);

export const useSubAgents = () =>
  useOperationsStore((state) => state.subAgents);

export const useTaskFlow = () =>
  useOperationsStore((state) => state.taskFlow);

export const useLiveFeed = () =>
  useOperationsStore((state) => state.liveFeed);

export const useConnectionStatus = () =>
  useOperationsStore((state) => ({
    isConnected: state.isConnected,
    error: state.connectionError,
  }));

export const useSubAgentCount = () =>
  useOperationsStore((state) => Object.keys(state.subAgents).length);

export const useActiveSubAgents = () =>
  useOperationsStore((state) =>
    Object.values(state.subAgents).filter(
      (agent) => agent.status !== 'completed' && agent.status !== 'failed'
    )
  );

export const useCompletedSubAgents = () =>
  useOperationsStore((state) =>
    Object.values(state.subAgents).filter(
      (agent) => agent.status === 'completed' || agent.status === 'failed'
    )
  );

/**
 * Combined selector for OperationsRoom component
 * NOTE: This is now deprecated - use individual selectors in the component instead
 * to avoid React external store caching issues. See OperationsRoom.tsx for the pattern.
 */

/**
 * Batch updates utility
 */
export const batchUpdateOperations = (updates: {
  mainAgent?: Partial<Agent>;
  subAgents?: Record<string, Partial<SubAgent>>;
  taskFlow?: TaskFlow;
  events?: OperationEvent[];
}) => {
  const store = useOperationsStore.getState();
  
  if (updates.mainAgent) {
    store.updateMainAgent(updates.mainAgent);
  }
  
  if (updates.subAgents) {
    Object.entries(updates.subAgents).forEach(([id, update]) => {
      store.updateSubAgent(id, update);
    });
  }
  
  if (updates.taskFlow) {
    store.updateTaskFlow(updates.taskFlow);
  }
  
  if (updates.events) {
    updates.events.forEach((event) => store.addEvent(event));
  }
};

/**
 * Reset store to initial state (for debugging)
 */
export const resetOperationsStore = () => {
  useOperationsStore.setState({
    mainAgent: null,
    subAgents: {},
    taskFlow: {
      backlog: [],
      todo: [],
      inProgress: [],
      review: [],
      done: [],
    },
    liveFeed: [],
    isConnected: false,
    connectionError: null,
    unseenEventCount: 0,
  });
};
