/**
 * LiveFeed - Real-time event stream display
 * Matrix-style live feed of all operations events
 */

import React, { useEffect, useRef } from 'react';
import type { LiveFeedProps, OperationEvent } from '@/types/operations';

/**
 * Format an event for display in the feed
 */
function formatEventMessage(event: OperationEvent): string {
  const { type, payload } = event;
  
  switch (type) {
    case 'agent.session.started':
      return `Session started: ${payload.agent_name || 'Unknown Agent'}`;
    case 'agent.session.terminated':
      return `Session terminated`;
    case 'subagent.spawned':
      return `Sub-agent spawned: ${payload.subagent_name || 'Unknown'}`;
    case 'subagent.completed':
      return `Sub-agent completed: ${payload.summary || 'Task complete'}`;
    case 'task.state_changed':
      return `Task updated: ${payload.old_state} → ${payload.new_state}`;
    case 'agent.work_activity':
      return `Activity: ${payload.tool_name || payload.activity_type}${
        payload.status ? ` (${payload.status})` : ''
      }`;
    case 'agent.status_updated':
      return `Status: ${payload.status}${
        payload.progress ? ` (${payload.progress}%)` : ''
      }`;
    case 'agent.error':
      return `Error: ${payload.message || payload.error_type}`;
    default:
      return `${type}: ${JSON.stringify(payload).slice(0, 50)}...`;
  }
}

/**
 * Get emoji for event type
 */
function getEventEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    'agent.session.started': '🟢',
    'agent.session.terminated': '⏹️',
    'subagent.spawned': '🚀',
    'subagent.completed': '✅',
    'task.state_changed': '📝',
    'agent.work_activity': '⚙️',
    'agent.status_updated': '📊',
    'agent.error': '❌',
    'system.connected': '🔗',
    'system.disconnected': '🔌',
  };
  
  return emojiMap[type] || '•';
}

/**
 * Get color class for event type
 */
function getEventColor(type: string): string {
  if (type.includes('error') || type.includes('failed')) return 'text-red-400';
  if (type.includes('completed')) return 'text-green-400';
  if (type.includes('spawned')) return 'text-yellow-400';
  if (type.includes('work') || type.includes('activity')) return 'text-cyan-400';
  return 'text-slate-400';
}

/**
 * EventLine - Individual event display
 */
const EventLine = React.memo(({ event }: { event: OperationEvent }) => {
  const timestamp = new Date(event.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const emoji = getEventEmoji(event.type);
  const colorClass = getEventColor(event.type);
  const message = formatEventMessage(event);
  const agent = event.agent_id?.split(':').pop() || 'system';
  
  return (
    <div className="hover:bg-slate-800 px-4 py-2 transition-colors duration-200">
      <div className="flex items-start gap-3 font-mono text-xs">
        {/* Timestamp */}
        <span className="text-green-400 flex-shrink-0">
          [{timestamp}]
        </span>
        
        {/* Emoji & Type */}
        <span className={`flex-shrink-0 ${colorClass} w-6`}>
          {emoji}
        </span>
        
        {/* Agent */}
        <span className="text-yellow-400 flex-shrink-0 w-24 truncate">
          [{agent}]
        </span>
        
        {/* Message */}
        <span className="text-slate-300 flex-1 break-words">
          {message}
        </span>
      </div>
    </div>
  );
});

EventLine.displayName = 'EventLine';

/**
 * LiveFeed component
 */
export const LiveFeed = React.memo(
  ({ events, maxItems = 50, isLoading = false, compact = false }: LiveFeedProps & { compact?: boolean }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScroll = useRef(true);
    
    // Auto-scroll to bottom when new events arrive
    useEffect(() => {
      if (!containerRef.current || !shouldAutoScroll.current) return;
      
      const timer = requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      });
      
      return () => cancelAnimationFrame(timer);
    }, [events]);
    
    // Track scroll position to determine if user scrolled up
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      shouldAutoScroll.current = scrollHeight - (scrollTop + clientHeight) < 100;
    };
    
    const displayEvents = events.slice(0, maxItems);
    
    if (compact) {
      return (
        <div className="border border-slate-700 rounded-lg bg-slate-900 flex flex-col h-full">
          {/* Compact Header */}
          <div className="px-3 py-2 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <span>📡</span>
              <span>LIVE FEED</span>
            </h3>
            <span className="text-xs text-slate-500">{displayEvents.length} events</span>
          </div>
          
          {/* Compact Events */}
          <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto bg-slate-950/50"
          >
            {displayEvents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                Waiting for events...
              </div>
            ) : (
              <div>
                {displayEvents.map((event, idx) => (
                  <div 
                    key={`${event.id}-${idx}`}
                    className="px-3 py-1.5 text-xs font-mono border-b border-slate-800 hover:bg-slate-800/50"
                  >
                    <span className="text-green-400 mr-2">
                      {new Date(event.timestamp).toLocaleTimeString('en-US', { 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit', 
                        hour12: false 
                      })}
                    </span>
                    <span className={getEventColor(event.type)}>
                      {getEventEmoji(event.type)} {formatEventMessage(event)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return (
      <div className="border-2 border-slate-700 rounded-lg bg-slate-900 flex flex-col h-[300px]">
        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-700 bg-slate-800">
          <h3 className="text-sm font-bold text-slate-200">
            LIVE FEED
            {events.length > maxItems && (
              <span className="ml-2 text-xs text-slate-500">
                ({displayEvents.length} of {events.length})
              </span>
            )}
          </h3>
        </div>
        
        {/* Events */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto bg-slate-950"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p className="text-sm">Loading events...</p>
            </div>
          ) : displayEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p className="text-sm">Waiting for events...</p>
            </div>
          ) : (
            <div className="space-y-0">
              {displayEvents.map((event, idx) => (
                <EventLine key={`${event.id}-${idx}`} event={event} />
              ))}
            </div>
          )}
        </div>
        
        {/* Footer info */}
        {displayEvents.length > 0 && (
          <div className="px-6 py-2 border-t border-slate-700 bg-slate-800 text-xs text-slate-400">
            <p>
              Showing {displayEvents.length} events
              {shouldAutoScroll.current ? ' • Auto-scroll enabled' : ' • Scroll locked'}
            </p>
          </div>
        )}
      </div>
    );
  }
);

LiveFeed.displayName = 'LiveFeed';
