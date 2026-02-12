import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Flag, Clock, MessageSquare, Ban, RotateCcw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';
import type { Task } from '@/types';
import { ASSIGNEES } from '@/types';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  isDragging?: boolean;
}

const priorityStyles = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-blue-500/20 text-blue-400',
  high: 'bg-amber-500/20 text-amber-400',
  urgent: 'bg-red-500/20 text-red-400',
};

export function TaskCard({ task, onClick, isDragging }: TaskCardProps) {
  const { getBusinessColor, getBusinessName } = useBusiness();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCurrentlyDragging = isDragging || isSortableDragging;

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return null;
    const assignee = ASSIGNEES.find(a => a.id === assigneeId);
    return assignee?.name || assigneeId;
  };

  const assigneeName = getAssigneeName(task.assignee_id);
  const businessColor = task.project?.business ? getBusinessColor(task.project.business) : '#6366f1';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`bg-[#1a1a3a] rounded-lg p-4 border border-[#2a2a4a] cursor-grab hover:border-indigo-500/50 transition-all card-glow ${
        isCurrentlyDragging ? 'opacity-50 shadow-lg ring-2 ring-indigo-500 shadow-indigo-500/20' : ''
      }`}
    >
      {/* Top row: Ticket number & Business badge */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {/* Ticket number */}
        {task.ticket_number && (
          <span className="text-xs font-mono bg-[#2a2a4a] text-gray-400 px-2 py-0.5 rounded">
            #{task.ticket_number}
          </span>
        )}
        
        {/* Business badge */}
        {task.project?.business && (
          <span
            className="text-xs px-2 py-0.5 rounded"
            style={{
              backgroundColor: `${businessColor}20`,
              color: businessColor,
            }}
          >
            {getBusinessName(task.project.business)}
          </span>
        )}
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.slice(0, 3).map((label) => (
            <span
              key={label}
              className="text-xs px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded"
            >
              {label}
            </span>
          ))}
          {task.labels.length > 3 && (
            <span className="text-xs text-gray-500">+{task.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Title */}
      <h4 className="font-medium text-white mb-2 line-clamp-2">{task.title}</h4>

      {/* Description preview */}
      {task.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Blocked reason indicator */}
      {task.status === 'blocked' && task.blocked_reason && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-md p-2 mb-3">
          <Ban size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-300 line-clamp-2">{task.blocked_reason}</p>
        </div>
      )}

      {/* Rejection reason indicator (when task was rejected from review) */}
      {task.status === 'in_progress' && task.rejection_reason && (
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 mb-3">
          <RotateCcw size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300 line-clamp-2"><span className="font-medium">Rejected:</span> {task.rejection_reason}</p>
        </div>
      )}

      {/* Footer row 1: Priority & Assignee */}
      <div className="flex items-center justify-between mb-2">
        {/* Priority */}
        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${priorityStyles[task.priority]}`}>
          <Flag size={10} />
          {task.priority}
        </span>

        {/* Assignee */}
        {assigneeName && (
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full gradient-accent flex items-center justify-center text-[10px] text-white font-medium">
              {assigneeName.charAt(0)}
            </span>
            <span className="text-xs text-gray-400">{assigneeName}</span>
          </div>
        )}
      </div>

      {/* Footer row 2: Due date & Last updated */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        {/* Due date */}
        {task.due_date ? (
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{format(new Date(task.due_date), 'MMM d')}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Last updated */}
        <div className="flex items-center gap-1">
          <Clock size={12} />
          <span>{formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
        </div>
      </div>
    </div>
  );
}
