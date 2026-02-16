/**
 * OperationsRoom - Main component for real-time agent activity visualization
 * Displays agent status, sub-agents, task flow, and live event feed
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useOperationRoomWebSocket } from '@/hooks/useOperationRoomWebSocket';
import { useOperationsRoomData } from '@/stores/operationsStore';
import { OperationsHeader } from './OperationsHeader';
import { MainAgentPanel } from './MainAgentPanel';
import { SubAgentGrid } from './SubAgentGrid';
import { TaskFlowKanban } from './TaskFlowKanban';
import { LiveFeed } from './LiveFeed';
import { ParticleEffectsCanvas } from './ParticleEffectsCanvas';
import { PixelOffice } from './PixelOffice';

/**
 * OperationsRoom - Main container component
 */
export const OperationsRoom = React.memo(() => {
  // Initialize WebSocket connection
  const wsState = useOperationRoomWebSocket();
  
  // View mode toggle
  const [viewMode, setViewMode] = useState<'pixel' | 'panels'>('pixel');
  
  // Get all state from store using single combined selector (prevents hooks ordering issues)
  const { mainAgent, subAgents, taskFlow, liveFeed, connectionStatus, subAgentCount } = 
    useOperationsRoomData();
  
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
      
      {/* View Mode Toggle */}
      <div className="flex justify-center items-center gap-2 py-4 px-6 bg-slate-900/50 border-b border-slate-700">
        <span className="text-sm text-slate-400 font-mono">View Mode:</span>
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('pixel')}
            className={`px-4 py-2 rounded-md text-sm font-mono transition-all ${
              viewMode === 'pixel'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎮 Pixel Office
          </button>
          <button
            onClick={() => setViewMode('panels')}
            className={`px-4 py-2 rounded-md text-sm font-mono transition-all ${
              viewMode === 'panels'
                ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📊 Panels
          </button>
        </div>
      </div>
      
      {/* Debug: Show data status (always show for debugging) */}
      <div className="bg-gray-800 text-xs font-mono p-2 text-gray-400 border-b border-gray-700">
        <span className="text-cyan-400">DEBUG:</span> mainAgent: {mainAgent?.name || 'null'} | subAgents: {subAgentCount} | events: {liveFeed.length} | connected: {connectionStatus.isConnected ? 'yes' : 'no'}
      </div>
      
      {/* Main content area */}
      {viewMode === 'pixel' ? (
        <div className="flex-1 overflow-hidden p-6">
          <PixelOffice />
        </div>
      ) : (
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
      )}
      
      {/* Particle Effects Overlay (only in panels mode) */}
      {viewMode === 'panels' && <ParticleEffectsCanvas />}
      
      {/* Connection error notification */}
      {!connectionStatus.isConnected && connectionStatus.error && (
        <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded max-w-md z-50">
          <p className="font-semibold">Connection Error</p>
          <p className="text-sm">{connectionStatus.error}</p>
        </div>
      )}
    </div>
  );
});

OperationsRoom.displayName = 'OperationsRoom';
