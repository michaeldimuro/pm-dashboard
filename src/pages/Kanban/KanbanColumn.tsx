import React from 'react';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, color, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 bg-[#12122a] rounded-xl border transition-all ${
        isOver
          ? 'border-indigo-500/50 ring-2 ring-indigo-500/20'
          : 'border-[#1a1a3a]'
      }`}
    >
      {/* Column header */}
      <div className="px-4 py-3 border-b border-[#1a1a3a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <h3 className="font-medium text-white">{title}</h3>
        </div>
        <span className="text-sm text-gray-500 bg-[#1a1a3a] px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      {/* Tasks container */}
      <div className="p-3 space-y-3 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
