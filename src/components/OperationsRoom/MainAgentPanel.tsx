/**
 * MainAgentPanel - Displays main agent (Xandus) status and progress
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { MainAgentPanelProps } from '@/types/operations';
import { StatusBadge } from './StatusBadge';
import { ProgressBar } from './ProgressBar';

/**
 * MainAgentPanel component
 */
export const MainAgentPanel = React.memo<MainAgentPanelProps>(
  ({ agent, isLoading = false }) => {
    if (isLoading) {
      return (
        <div className="border-2 border-slate-700 rounded-lg p-6 bg-slate-900 animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-700 rounded w-2/3"></div>
        </div>
      );
    }
    
    if (!agent) {
      return (
        <div className="border-2 border-slate-700 rounded-lg p-6 bg-slate-900">
          <div className="flex items-center gap-3 text-slate-400">
            <AlertCircle size={20} />
            <p className="text-sm">No main agent active</p>
          </div>
        </div>
      );
    }
    
    return (
      <div
        className="border-2 border-cyan-600 rounded-lg p-6 bg-gradient-to-br from-slate-900 to-slate-800 
                   shadow-lg shadow-cyan-500/20 transition-all duration-300
                   hover:shadow-cyan-500/30"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-cyan-300">{agent.name}</h2>
            <p className="text-xs text-slate-400 mt-1">Main Agent</p>
          </div>
          <StatusBadge
            status={agent.status}
            size="md"
            withLabel={true}
          />
        </div>
        
        {/* Divider */}
        <div className="border-t border-slate-700 mb-4"></div>
        
        {/* Current Task */}
        <div className="space-y-2 mb-4">
          <p className="text-xs text-slate-400">CURRENT TASK</p>
          <p className="text-sm font-medium text-slate-200">
            {agent.currentTask || 'No task assigned'}
          </p>
        </div>
        
        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">PROGRESS</p>
            <span className="text-sm font-semibold text-cyan-400">{agent.progress}%</span>
          </div>
          <ProgressBar
            value={agent.progress}
            color="cyan"
            animated={agent.status === 'working'}
          />
        </div>
        
        {/* Timeline */}
        <div className="space-y-2 text-xs text-slate-400">
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
          
          {agent.estimatedCompletion && (
            <div className="flex items-center justify-between">
              <span>Estimated Complete:</span>
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
          
          <div className="flex items-center justify-between">
            <span>Last Activity:</span>
            <span className="font-mono text-slate-300">
              {agent.lastActivityAt.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

MainAgentPanel.displayName = 'MainAgentPanel';
