/**
 * SubAgentPanel - Individual sub-agent card with status and progress
 */

import React from 'react';
import type { SubAgentPanelProps } from '@/types/operations';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

/**
 * Get color theme based on agent status
 */
function getStatusTheme(status: string) {
  const themes: Record<string, { border: string; shadow: string; bg: string }> = {
    spawned: {
      border: 'border-yellow-600',
      shadow: 'shadow-yellow-500/20',
      bg: 'from-yellow-950 to-yellow-900',
    },
    active: {
      border: 'border-blue-600',
      shadow: 'shadow-blue-500/20',
      bg: 'from-blue-950 to-blue-900',
    },
    working: {
      border: 'border-cyan-600',
      shadow: 'shadow-cyan-500/20',
      bg: 'from-cyan-950 to-cyan-900',
    },
    idle: {
      border: 'border-slate-600',
      shadow: 'shadow-slate-500/10',
      bg: 'from-slate-900 to-slate-800',
    },
    completed: {
      border: 'border-green-600',
      shadow: 'shadow-green-500/20',
      bg: 'from-green-950 to-green-900',
    },
    failed: {
      border: 'border-red-600',
      shadow: 'shadow-red-500/20',
      bg: 'from-red-950 to-red-900',
    },
  };
  
  return themes[status] || themes.idle;
}

/**
 * SubAgentPanel component
 */
export const SubAgentPanel = React.memo<SubAgentPanelProps>(
  ({ agent }) => {
    const theme = getStatusTheme(agent.status);
    const isActive = agent.status !== 'completed' && agent.status !== 'failed';
    
    return (
      <div
        className={`
          border-2 ${theme.border} rounded-lg p-4 bg-gradient-to-br ${theme.bg}
          shadow-lg ${theme.shadow} transition-all duration-300
          ${isActive ? 'hover:shadow-lg hover:scale-105' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white truncate">{agent.name}</h4>
            <p className="text-xs text-slate-400 truncate">{agent.currentTask || agent.assignedTask}</p>
          </div>
          <StatusBadge
            status={agent.status}
            size="sm"
            withLabel={false}
          />
        </div>
        
        {/* Progress Bar */}
        {isActive && (
          <div className="mb-3">
            <ProgressBar
              value={agent.progress}
              color={agent.status === 'working' ? 'cyan' : 'blue'}
              animated={agent.status === 'working'}
              showLabel={true}
            />
          </div>
        )}
        
        {/* Status-specific content */}
        {agent.status === 'completed' && (
          <div className="text-sm text-green-300 mb-3">
            <p className="font-semibold">✓ Completed</p>
            {agent.summary && (
              <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                {agent.summary}
              </p>
            )}
          </div>
        )}
        
        {agent.status === 'failed' && (
          <div className="text-sm text-red-300 mb-3">
            <p className="font-semibold">✕ Failed</p>
          </div>
        )}
        
        {/* Timeline */}
        <div className="space-y-1 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Started:</span>
            <span className="font-mono text-slate-300">
              {agent.startedAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </span>
          </div>
          
          {agent.estimatedCompletion && isActive && (
            <div className="flex items-center justify-between">
              <span>Est. Complete:</span>
              <span className="font-mono text-cyan-400">
                {agent.estimatedCompletion.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
          )}
          
          {agent.completedAt && (
            <div className="flex items-center justify-between">
              <span>Completed:</span>
              <span className="font-mono text-green-400">
                {agent.completedAt.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                })}
              </span>
            </div>
          )}
        </div>
        
        {/* Deliverables */}
        {agent.deliverables && agent.deliverables.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Deliverables:</p>
            <div className="space-y-1">
              {agent.deliverables.slice(0, 2).map((deliverable, idx) => (
                <p
                  key={idx}
                  className="text-xs text-slate-300 truncate"
                  title={deliverable}
                >
                  • {deliverable}
                </p>
              ))}
              {agent.deliverables.length > 2 && (
                <p className="text-xs text-slate-400">
                  +{agent.deliverables.length - 2} more
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

SubAgentPanel.displayName = 'SubAgentPanel';
