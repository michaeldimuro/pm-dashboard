/**
 * OperationsRoom - Main component for real-time agent activity visualization
 * Left: Pixel Office canvas | Right: Agent info panel
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useOperationRoomWebSocket } from '@/hooks/useOperationRoomWebSocket';
import { useOperationsStore } from '@/stores/operationsStore';
import { OperationsHeader } from './OperationsHeader';
import { PixelOffice } from './PixelOffice';
import { LiveFeed } from './LiveFeed';
import type { Agent, SubAgent } from '@/types/operations';

/**
 * Agent Info Panel - Shows details for selected agent
 */
interface AgentInfoPanelProps {
  selectedAgent: Agent | SubAgent | null;
  mainAgent: Agent | null;
  subAgents: Record<string, SubAgent>;
  onSelectAgent: (id: string | null) => void;
}

const AgentInfoPanel: React.FC<AgentInfoPanelProps> = ({
  selectedAgent,
  mainAgent,
  subAgents,
  onSelectAgent,
}) => {
  const allAgents = useMemo(() => {
    const agents: (Agent | SubAgent)[] = [];
    if (mainAgent) agents.push(mainAgent);
    agents.push(...Object.values(subAgents));
    return agents;
  }, [mainAgent, subAgents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
      case 'active':
        return 'text-green-400 bg-green-400/20';
      case 'idle':
        return 'text-yellow-400 bg-yellow-400/20';
      case 'completed':
        return 'text-blue-400 bg-blue-400/20';
      case 'failed':
        return 'text-red-400 bg-red-400/20';
      default:
        return 'text-gray-400 bg-gray-400/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/95 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>🦞</span>
          <span>Agent Details</span>
        </h2>
      </div>

      {/* Selected Agent Details */}
      <div className="p-4 border-b border-slate-700">
        {selectedAgent ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                  🦞
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedAgent.name === 'Xandus' ? 'Xandus' : selectedAgent.name}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedAgent.status)}`}>
                    {selectedAgent.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onSelectAgent(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {/* Current Task */}
            {selectedAgent.currentTask && (
              <div className="bg-slate-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">Current Task</div>
                <div className="text-sm text-white">{selectedAgent.currentTask}</div>
              </div>
            )}

            {/* Progress Bar */}
            {selectedAgent.progress > 0 && (
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{selectedAgent.progress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                    style={{ width: `${selectedAgent.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Timestamps */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-800 rounded p-2">
                <div className="text-gray-400">Started</div>
                <div className="text-white font-mono">
                  {selectedAgent.startedAt?.toLocaleTimeString() || 'N/A'}
                </div>
              </div>
              <div className="bg-slate-800 rounded p-2">
                <div className="text-gray-400">Last Active</div>
                <div className="text-white font-mono">
                  {selectedAgent.lastActivityAt?.toLocaleTimeString() || 'Now'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">👆</div>
            <p>Click on a lobster to see details</p>
          </div>
        )}
      </div>

      {/* Agent List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <span>📋</span>
          <span>Active Agents ({allAgents.length})</span>
        </h3>
        
        {allAgents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-3xl mb-2">😴</div>
            <p className="text-sm">No active agents</p>
            <p className="text-xs mt-1">Waiting for agents to come online...</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedAgent?.id === agent.id
                    ? 'bg-cyan-500/20 border border-cyan-500'
                    : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🦞</span>
                    <span className="font-medium text-white">{agent.name}</span>
                    {'parentSessionId' in agent ? null : (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-500/30 text-purple-300 rounded">
                        MAIN
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(agent.status)}`}>
                    {agent.status}
                  </span>
                </div>
                {agent.currentTask && (
                  <div className="text-xs text-gray-400 mt-1 truncate">
                    {agent.currentTask}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * OperationsRoom - Main container component
 */
export const OperationsRoom = React.memo(() => {
  // Initialize WebSocket connection
  const wsState = useOperationRoomWebSocket();
  
  // Selected agent for info panel
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Get state from store using individual selectors
  const mainAgent = useOperationsStore((state) => state.mainAgent);
  const subAgents = useOperationsStore((state) => state.subAgents);
  const liveFeed = useOperationsStore((state) => state.liveFeed);
  const isConnected = useOperationsStore((state) => state.isConnected);
  const connectionError = useOperationsStore((state) => state.connectionError);
  const subAgentCount = Object.keys(subAgents).length;
  
  // Get selected agent
  const selectedAgent = useMemo(() => {
    if (!selectedAgentId) return null;
    if (mainAgent?.id === selectedAgentId) return mainAgent;
    return subAgents[selectedAgentId] || null;
  }, [selectedAgentId, mainAgent, subAgents]);
  
  // Memoize connectionStatus
  const connectionStatus = useMemo(
    () => ({ isConnected, error: connectionError }),
    [isConnected, connectionError]
  );
  
  // Calculate metrics
  const eventRate = useMemo(() => {
    if (liveFeed.length === 0) return 0;
    
    const now = new Date().getTime();
    const oneSecondAgo = now - 1000;
    
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
    console.log('[OperationsRoom] Mounted');
    console.log('[OperationsRoom] mainAgent:', mainAgent);
    console.log('[OperationsRoom] subAgents:', subAgents);
    
    return () => {
      console.log('[OperationsRoom] Unmounted');
    };
  }, [mainAgent, subAgents]);
  
  // Handle agent selection from pixel office
  const handleAgentSelect = (agentId: string | null) => {
    setSelectedAgentId(agentId);
  };
  
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
      {/* Header with status */}
      <OperationsHeader
        isConnected={connectionStatus.isConnected}
        activeSessionCount={subAgentCount + (mainAgent ? 1 : 0)}
        eventRate={eventRate}
      />
      
      {/* Main content: 2-column layout */}
      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* Left: Pixel Office (contained size) */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900">
            <PixelOffice onAgentSelect={handleAgentSelect} selectedAgentId={selectedAgentId} />
          </div>
          
          {/* Live Feed below canvas */}
          <div className="mt-4 h-48 overflow-hidden">
            <LiveFeed events={liveFeed.slice(0, 10)} compact />
          </div>
        </div>
        
        {/* Right: Agent Info Panel */}
        <div className="w-80 flex-shrink-0">
          <AgentInfoPanel
            selectedAgent={selectedAgent}
            mainAgent={mainAgent}
            subAgents={subAgents}
            onSelectAgent={handleAgentSelect}
          />
        </div>
      </div>
      
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
