/**
 * TaskFlowKanban - Display tasks organized by status in kanban columns
 */

import React from 'react';
import type { TaskFlowKanbanProps } from '@/types/operations';

interface ColumnConfig {
  title: string;
  color: string;
  icon: string;
}

const COLUMN_CONFIG: Record<string, ColumnConfig> = {
  backlog: { title: 'BACKLOG', color: 'slate', icon: '📋' },
  todo: { title: 'TO DO', color: 'blue', icon: '□' },
  inProgress: { title: 'IN PROGRESS', color: 'cyan', icon: '▶' },
  review: { title: 'REVIEW', color: 'yellow', icon: '👁' },
  done: { title: 'DONE', color: 'green', icon: '✓' },
};

/**
 * TaskCard - Individual task display
 */
const TaskCard = React.memo(({ task }: { task: any }) => {
  const priorityColors: Record<string, string> = {
    low: 'border-blue-600 bg-blue-950',
    medium: 'border-cyan-600 bg-cyan-950',
    high: 'border-yellow-600 bg-yellow-950',
    urgent: 'border-red-600 bg-red-950',
  };
  
  const colorClass = priorityColors[task.priority] || priorityColors.medium;
  
  return (
    <div
      className={`
        border-l-2 p-3 rounded bg-slate-800 text-slate-100 text-xs
        hover:shadow-md transition-all duration-200 cursor-pointer
        ${colorClass}
      `}
    >
      <p className="font-semibold line-clamp-2">{task.title}</p>
      {task.description && (
        <p className="text-slate-400 line-clamp-1 mt-1">{task.description}</p>
      )}
    </div>
  );
});

TaskCard.displayName = 'TaskCard';

/**
 * KanbanColumn - Column for a single status
 */
interface ColumnProps {
  status: keyof typeof COLUMN_CONFIG;
  tasks: any[];
}

const KanbanColumn = React.memo<ColumnProps>(({ status, tasks }) => {
  const config = COLUMN_CONFIG[status];
  
  if (!config) return null;
  
  const borderColor: Record<string, string> = {
    slate: 'border-slate-600',
    blue: 'border-blue-600',
    cyan: 'border-cyan-600',
    yellow: 'border-yellow-600',
    green: 'border-green-600',
  };
  
  return (
    <div className={`border border-l-4 ${borderColor[config.color]} rounded-lg bg-slate-900 flex flex-col min-h-[400px]`}>
      {/* Column header */}
      <div className={`px-4 py-3 border-b border-slate-700 bg-slate-800`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.icon}</span>
          <h4 className="font-semibold text-slate-200 text-sm">{config.title}</h4>
          <span className="ml-auto font-semibold text-slate-400 text-sm">
            ({tasks.length})
          </span>
        </div>
      </div>
      
      {/* Tasks */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 text-xs">
            No tasks
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>
    </div>
  );
});

KanbanColumn.displayName = 'KanbanColumn';

/**
 * TaskFlowKanban component
 */
export const TaskFlowKanban = React.memo<TaskFlowKanbanProps>(
  ({ taskFlow, onTaskMove }) => {
    const totalTasks = Object.values(taskFlow).reduce((sum, tasks) => sum + tasks.length, 0);
    
    return (
      <div className="border-2 border-slate-700 rounded-lg bg-slate-900 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-200">
            TASK FLOW ({totalTasks} tasks)
          </h3>
        </div>
        
        <div className="grid grid-cols-5 gap-3 overflow-x-auto pb-4">
          <KanbanColumn status="backlog" tasks={taskFlow.backlog} />
          <KanbanColumn status="todo" tasks={taskFlow.todo} />
          <KanbanColumn status="inProgress" tasks={taskFlow.inProgress} />
          <KanbanColumn status="review" tasks={taskFlow.review} />
          <KanbanColumn status="done" tasks={taskFlow.done} />
        </div>
      </div>
    );
  }
);

TaskFlowKanban.displayName = 'TaskFlowKanban';
