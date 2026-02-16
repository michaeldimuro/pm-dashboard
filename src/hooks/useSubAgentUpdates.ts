/**
 * useSubAgentUpdates - Track sub-agent changes and provide derived state
 * Provides helpers for monitoring sub-agent lifecycle and status changes
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { SubAgent, UseSubAgentUpdatesReturn } from '../types/operations';
import { useOperationsStore } from './useOperationsStore';

/**
 * Hook for tracking sub-agent updates and changes
 */
export const useSubAgentUpdates = (): UseSubAgentUpdatesReturn => {
  const { subAgents, liveFeed } = useOperationsStore();
  const prevSubAgentsRef = useRef<Record<string, SubAgent>>({});
  const newSubAgentIdsRef = useRef<Set<string>>(new Set());
  
  /**
   * Detect new sub-agents
   */
  useEffect(() => {
    const currentIds = Object.keys(subAgents);
    const prevIds = Object.keys(prevSubAgentsRef.current);
    
    currentIds.forEach((id) => {
      if (!prevIds.includes(id)) {
        newSubAgentIdsRef.current.add(id);
      }
    });
    
    prevSubAgentsRef.current = subAgents;
  }, [subAgents]);
  
  /**
   * Check if there's a newly spawned sub-agent in the last 5 seconds
   */
  const hasNewSubAgent = useMemo(() => {
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000);
    
    return liveFeed.some(
      (event) =>
        event.type === 'subagent.spawned' &&
        new Date(event.timestamp) > fiveSecondsAgo
    );
  }, [liveFeed]);
  
  /**
   * Get active sub-agents (not completed/failed)
   */
  const activeSubAgents = useMemo(
    () =>
      Object.values(subAgents).filter(
        (agent) => agent.status !== 'completed' && agent.status !== 'failed'
      ),
    [subAgents]
  );
  
  /**
   * Get completed sub-agents
   */
  const completedSubAgents = useMemo(
    () =>
      Object.values(subAgents).filter(
        (agent) => agent.status === 'completed' || agent.status === 'failed'
      ),
    [subAgents]
  );
  
  /**
   * Get total count
   */
  const totalSubAgents = useMemo(
    () => Object.keys(subAgents).length,
    [subAgents]
  );
  
  /**
   * Get average progress of active agents
   */
  const averageProgress = useMemo(() => {
    if (activeSubAgents.length === 0) return 0;
    const totalProgress = activeSubAgents.reduce(
      (sum, agent) => sum + agent.progress,
      0
    );
    return Math.round(totalProgress / activeSubAgents.length);
  }, [activeSubAgents]);
  
  /**
   * Get agents by status
   */
  const agentsByStatus = useMemo(
    () => ({
      spawned: Object.values(subAgents).filter((a) => a.status === 'spawned'),
      active: Object.values(subAgents).filter((a) => a.status === 'active'),
      working: Object.values(subAgents).filter((a) => a.status === 'working'),
      idle: Object.values(subAgents).filter((a) => a.status === 'idle'),
      completed: Object.values(subAgents).filter((a) => a.status === 'completed'),
      failed: Object.values(subAgents).filter((a) => a.status === 'failed'),
    }),
    [subAgents]
  );
  
  /**
   * Get the most recently updated agent
   */
  const mostRecentlyUpdated = useMemo(
    () => {
      const agents = Object.values(subAgents);
      if (agents.length === 0) return null;
      return agents.reduce((latest, agent) =>
        agent.lastActivityAt > latest.lastActivityAt ? agent : latest
      );
    },
    [subAgents]
  );
  
  /**
   * Get agents that haven't updated in the last N seconds
   */
  const getIdleAgents = useCallback(
    (seconds: number = 60): SubAgent[] => {
      const threshold = new Date(Date.now() - seconds * 1000);
      return Object.values(subAgents).filter(
        (agent) =>
          agent.status === 'active' || agent.status === 'idle' &&
          agent.lastActivityAt < threshold
      );
    },
    [subAgents]
  );
  
  /**
   * Get agents working on a specific task
   */
  const getAgentsByTask = useCallback(
    (taskId: string): SubAgent[] =>
      Object.values(subAgents).filter(
        (agent) => agent.currentTask.includes(taskId)
      ),
    [subAgents]
  );
  
  /**
   * Get agents assigned to a specific parent session
   */
  const getAgentsByParentSession = useCallback(
    (parentSessionId: string): SubAgent[] =>
      Object.values(subAgents).filter(
        (agent) => agent.parentSessionId === parentSessionId
      ),
    [subAgents]
  );
  
  /**
   * Track status transitions (for animation purposes)
   */
  const statusTransitions = useMemo(() => {
    const transitions: Array<{
      agentId: string;
      fromStatus: string;
      toStatus: string;
      timestamp: Date;
    }> = [];
    
    // Check for recent spawned events
    liveFeed.forEach((event) => {
      if (event.type === 'subagent.spawned') {
        transitions.push({
          agentId: event.payload.subagent_id,
          fromStatus: 'none',
          toStatus: 'spawned',
          timestamp: new Date(event.timestamp),
        });
      } else if (event.type === 'subagent.completed') {
        transitions.push({
          agentId: event.agent_id,
          fromStatus: 'working',
          toStatus: 'completed',
          timestamp: new Date(event.timestamp),
        });
      } else if (event.type === 'subagent.failed') {
        transitions.push({
          agentId: event.agent_id,
          fromStatus: 'working',
          toStatus: 'failed',
          timestamp: new Date(event.timestamp),
        });
      }
    });
    
    return transitions;
  }, [liveFeed]);
  
  /**
   * Clear new agent indicator
   */
  const clearNewAgentIndicator = useCallback(() => {
    newSubAgentIdsRef.current.clear();
  }, []);
  
  /**
   * Get summary stats
   */
  const stats = useMemo(
    () => ({
      total: totalSubAgents,
      active: activeSubAgents.length,
      completed: completedSubAgents.filter((a) => a.status === 'completed').length,
      failed: completedSubAgents.filter((a) => a.status === 'failed').length,
      averageProgress,
      completionRate:
        totalSubAgents === 0
          ? 0
          : Math.round(
              (completedSubAgents.filter((a) => a.status === 'completed').length /
                totalSubAgents) *
                100
            ),
    }),
    [totalSubAgents, activeSubAgents.length, completedSubAgents, averageProgress]
  );
  
  // Return only required interface properties, store others internally
  return {
    activeSubAgents,
    completedSubAgents,
    totalSubAgents,
    hasNewSubAgent,
  };
};
