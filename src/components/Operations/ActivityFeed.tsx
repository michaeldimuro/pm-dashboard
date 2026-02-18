/**
 * ActivityFeed — Real-time event log for operations
 */

import React from 'react';
import type { OperationEvent } from '@/types/operations';

interface ActivityFeedProps {
  events: OperationEvent[];
  maxItems?: number;
  agentFilter?: string;
}

function formatEventMessage(event: OperationEvent): { icon: string; message: string } {
  const payload = event.payload || {};
  const agentName = (payload.agent_name as string) || event.agent_id;

  switch (event.type) {
    case 'agent.session.started':
      return { icon: '>', message: `${agentName} started a session` };
    case 'agent.session.terminated':
      return { icon: '#', message: `${agentName} session ended` };
    case 'agent.status_updated':
      return { icon: '~', message: `${agentName} status: ${payload.status || 'unknown'}` };
    case 'agent.work_activity':
      return { icon: '*', message: `${agentName} ${payload.activity || 'working'}` };
    case 'subagent.spawned':
      return { icon: '+', message: `${agentName} spawned sub-agent: ${payload.subagent_name || 'unknown'}` };
    case 'subagent.completed':
      return { icon: '=', message: `Sub-agent ${payload.subagent_name || 'unknown'} completed` };
    case 'task.created':
      return { icon: '+', message: `${agentName} created task: "${payload.title || 'untitled'}"` };
    case 'task.state_changed':
      return { icon: '~', message: `Task moved to ${payload.new_status || 'unknown'}` };
    default:
      return { icon: '.', message: `${agentName}: ${event.type}` };
  }
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--';
  }
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  events,
  maxItems = 20,
  agentFilter,
}) => {
  const filtered = agentFilter
    ? events.filter((e) => e.agent_id === agentFilter)
    : events;
  const display = filtered.slice(0, maxItems);

  return (
    <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl">
      <div className="px-4 py-3 border-b border-[#1e1e3a]">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Live Activity Feed
        </h3>
      </div>
      <div className="max-h-[300px] overflow-y-auto">
        {display.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-600 text-sm">
            No recent activity
          </div>
        ) : (
          <div className="divide-y divide-[#1e1e3a]">
            {display.map((event) => {
              const { icon, message } = formatEventMessage(event);
              return (
                <div key={event.id} className="px-4 py-2.5 flex items-start gap-3">
                  <span className="text-xs text-gray-600 font-mono whitespace-nowrap mt-0.5">
                    {formatTime(event.timestamp)}
                  </span>
                  <span className="text-gray-600 font-mono text-xs mt-0.5">{icon}</span>
                  <span className="text-sm text-gray-400 flex-1">{message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
