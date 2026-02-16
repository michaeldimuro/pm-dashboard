/**
 * OperationsHeader - Title + connection status + metrics
 * Displays header with operational status indicators
 */

import React, { useMemo } from 'react';
import type { OperationsHeaderProps } from '../../types/operations';

/**
 * OperationsHeader component
 */
export const OperationsHeader = React.memo<OperationsHeaderProps>(
  ({
    isConnected,
    activeSessionCount = 0,
    eventRate = 0,
  }) => {
    // Determine connection status color and text
    const connectionStatus = useMemo(() => {
      if (isConnected) {
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-950',
          badge: '●',
          text: 'Connected',
        };
      }
      return {
        color: 'text-red-400',
        bgColor: 'bg-red-950',
        badge: '○',
        text: 'Disconnected',
      };
    }, [isConnected]);
    
    return (
      <header className="border-b border-slate-700 bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title */}
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              OPERATIONS ROOM
            </div>
            <div className="text-xs text-slate-500 font-mono">
              real-time agent visualization
            </div>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-6">
            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded border ${connectionStatus.bgColor} ${connectionStatus.color}`}>
              <span className="text-lg">{connectionStatus.badge}</span>
              <span className="text-sm font-semibold">{connectionStatus.text}</span>
            </div>
            
            {/* Active Sessions */}
            <div className="flex items-center gap-2 px-4 py-2 rounded border border-blue-700 bg-blue-950 text-blue-400">
              <span className="text-lg">◆</span>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Sessions</span>
                <span className="text-sm font-semibold">{activeSessionCount}</span>
              </div>
            </div>
            
            {/* Event Rate */}
            <div className="flex items-center gap-2 px-4 py-2 rounded border border-cyan-700 bg-cyan-950 text-cyan-400">
              <span className="text-lg">⟳</span>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400">Events/sec</span>
                <span className="text-sm font-semibold">{eventRate}</span>
              </div>
            </div>
            
            {/* Timestamp */}
            <div className="text-xs text-slate-500 font-mono px-4 py-2">
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              })}
            </div>
          </div>
        </div>
      </header>
    );
  }
);

OperationsHeader.displayName = 'OperationsHeader';
