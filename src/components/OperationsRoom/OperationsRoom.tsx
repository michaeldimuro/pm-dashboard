/**
 * OperationsRoom - Main component for real-time agent activity visualization
 * Displays agent status, sub-agents, task flow, and live event feed
 */

import React, { useEffect, useMemo } from 'react';
import { useOperationRoomWebSocket } from '@/hooks/useOperationRoomWebSocket';
import {
  useOperationsStore,
  useMainAgent,
  useSubAgents,
  useTaskFlow,
  useLiveFeed,
  useConnectionStatus,
  useSubAgentCount,
  useActiveSubAgents,
} from '@/stores/operationsStore';
import { OperationsHeader } from './OperationsHeader';
import { MainAgentPanel } from './MainAgentPanel';
import { SubAgentGrid } from './SubAgentGrid';
import { TaskFlowKanban } from './TaskFlowKanban';
import { LiveFeed } from './LiveFeed';
import { ParticleEffectsCanvas } from './ParticleEffectsCanvas';

/**
 * OperationsRoom - Main container component
 */
export const OperationsRoom = React.memo(() => {
  // Initialize WebSocket connection
  const wsState = useOperationRoomWebSocket();
  
  // Get state from store using selectors
  const mainAgent = useMainAgent();
  const subAgents = useSubAgents();
  const taskFlow = useTaskFlow();
  const liveFeed = useLiveFeed();
  const connectionStatus = useConnectionStatus();
  const activeSubAgents = useActiveSubAgents();
  const subAgentCount = useSubAgentCount();
  
  // Calculate metrics
  const eventRate = useMemo(() => {
    if (liveFeed.length === 0) return 0;
    
    const now = new Date().getTime();
    const oneSecondAgo = now - 1000;
    
    // Count events in last second
    const recentEvents = liveFeed.filter((event) => {
      try {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime > oneSecondAgo;
      } catch {
        return false;
      }
    });
    
    return recentEvents.length;
  }, [liveFeed]);
  
  // Log mount/unmount
  useEffect(() => {
    console.log('[OperationsRoom] Mounted, WebSocket initialized');
    
    return () => {
      console.log('[OperationsRoom] Unmounted');
    };
  }, []);
  
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
      {/* Header with status */}
      <OperationsHeader
        isConnected={connectionStatus.isConnected}
        activeSessionCount={subAgentCount + (mainAgent ? 1 : 0)}
        eventRate={eventRate}
      />
      
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left: Main Agent Panel */}
          <div className="lg:col-span-1">
            <MainAgentPanel agent={mainAgent} />
          </div>
          
          {/* Right: Sub-Agents Grid + Task Flow */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sub-Agents Grid */}
            <SubAgentGrid agents={Object.values(subAgents)} />
            
            {/* Task Flow Kanban */}
            <TaskFlowKanban taskFlow={taskFlow} />
          </div>
        </div>
        
        {/* Bottom: Live Feed */}
        <div className="px-6 pb-6">
          <LiveFeed events={liveFeed} />
        </div>
      </div>
      
      {/* Particle Effects Overlay */}
      <ParticleEffectsCanvas />
      
      {/* Connection error notification */}
      {!connectionStatus.isConnected && connectionStatus.error && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded max-w-md">
          <p className="font-semibold">Connection Error</p>
          <p className="text-sm">{connectionStatus.error}</p>
        </div>
      )}
    </div>
  );
});

OperationsRoom.displayName = 'OperationsRoom';
