/**
 * AgentKanban — Filtered kanban view showing tasks assigned to a specific agent
 */

import React from 'react';
import type { Task } from '@/types/index';

interface AgentKanbanProps {
  tasksByStatus: {
    backlog: Task[];
    todo: Task[];
    in_progress: Task[];
    blocked: Task[];
    review: Task[];
    done: Task[];
  };
  loading: boolean;
}

const columns = [
  { key: 'todo' as const, label: 'To Do', color: 'border-blue-500/30' },
  { key: 'in_progress' as const, label: 'In Progress', color: 'border-yellow-500/30' },
  { key: 'review' as const, label: 'Review', color: 'border-purple-500/30' },
  { key: 'done' as const, label: 'Done', color: 'border-green-500/30' },
];

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-orange-500/20 text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-gray-500/20 text-gray-400',
};

export const AgentKanban: React.FC<AgentKanbanProps> = ({ tasksByStatus, loading }) => {
  if (loading) {
    return (
      <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl">
      <div className="px-4 py-3 border-b border-[#1e1e3a]">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Agent Tasks
        </h3>
      </div>
      <div className="grid grid-cols-4 gap-0 divide-x divide-[#1e1e3a]">
        {columns.map((col) => {
          const tasks = tasksByStatus[col.key];
          return (
            <div key={col.key} className="min-h-[200px]">
              <div className={`px-3 py-2 border-b-2 ${col.color}`}>
                <span className="text-xs font-medium text-gray-400 uppercase">
                  {col.label} ({tasks.length})
                </span>
              </div>
              <div className="p-2 space-y-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-gray-600 text-center py-4">No tasks</p>
                ) : (
                  tasks.slice(0, 10).map((task) => (
                    <div
                      key={task.id}
                      className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg p-3 hover:border-[#2a2a5a] transition-colors"
                    >
                      <p className="text-sm text-gray-200 font-medium mb-1 line-clamp-2">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2">
                        {task.priority && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${priorityColors[task.priority] || priorityColors.medium}`}
                          >
                            {task.priority}
                          </span>
                        )}
                        {task.ticket_number && (
                          <span className="text-[10px] text-gray-600">
                            #{task.ticket_number}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
