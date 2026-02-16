/**
 * StatusBadge - Reusable status indicator component
 * Displays status with appropriate color and optional label
 */

import React from 'react';
import type { StatusBadgeProps } from '../../types/operations';

const STATUS_CONFIG = {
  // Agent statuses
  active: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'Active', icon: '●' },
  idle: { bg: 'bg-slate-600', text: 'text-slate-100', label: 'Idle', icon: '○' },
  working: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: 'Working', icon: '◆' },
  waiting: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Waiting', icon: '⟳' },
  
  // Sub-agent statuses
  spawned: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Spawned', icon: '◇' },
  completed: { bg: 'bg-green-600', text: 'text-green-100', label: 'Completed', icon: '✓' },
  failed: { bg: 'bg-red-600', text: 'text-red-100', label: 'Failed', icon: '✕' },
  
  // Task statuses
  backlog: { bg: 'bg-slate-600', text: 'text-slate-100', label: 'Backlog', icon: '📋' },
  todo: { bg: 'bg-blue-600', text: 'text-blue-100', label: 'To Do', icon: '□' },
  in_progress: { bg: 'bg-cyan-600', text: 'text-cyan-100', label: 'In Progress', icon: '▶' },
  review: { bg: 'bg-yellow-600', text: 'text-yellow-100', label: 'Review', icon: '👁' },
  done: { bg: 'bg-green-600', text: 'text-green-100', label: 'Done', icon: '✓' },
} as const;

const SIZE_CONFIG = {
  sm: {
    padding: 'px-2 py-1',
    fontSize: 'text-xs',
    iconSize: 'text-xs',
  },
  md: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-sm',
    iconSize: 'text-sm',
  },
  lg: {
    padding: 'px-4 py-2',
    fontSize: 'text-base',
    iconSize: 'text-base',
  },
};

/**
 * StatusBadge component
 */
export const StatusBadge = React.memo<StatusBadgeProps>(
  ({
    status,
    size = 'md',
    withLabel = true,
    className = '',
  }) => {
    // Normalize status for lookup (handle in_progress vs inProgress)
    const normalizedStatus = status.toLowerCase().replace(/_/g, '_') as keyof typeof STATUS_CONFIG;
    const config = STATUS_CONFIG[normalizedStatus as any] || STATUS_CONFIG.idle;
    const sizeConfig = SIZE_CONFIG[size];
    
    return (
      <span
        className={`
          inline-flex items-center gap-1 font-semibold rounded-full
          ${sizeConfig.padding}
          ${config.bg}
          ${config.text}
          ${className}
        `}
      >
        <span className={sizeConfig.iconSize}>{config.icon}</span>
        {withLabel && <span className={sizeConfig.fontSize}>{config.label}</span>}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
