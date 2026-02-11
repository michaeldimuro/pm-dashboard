import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal } from 'lucide-react';

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
      className={`flex-shrink-0 w-72 bg-gray-100 rounded-xl flex flex-col max-h-[calc(100vh-220px)] transition-colors ${
        isOver ? 'bg-indigo-50 ring-2 ring-indigo-500 ring-opacity-50' : ''
      }`}
    >
      {/* Column header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="font-medium text-gray-700">{title}</h3>
          <span className="text-sm text-gray-400 bg-white px-2 py-0.5 rounded-full">
            {count}
          </span>
        </div>
        <button className="p-1 hover:bg-gray-200 rounded transition">
          <MoreHorizontal size={16} className="text-gray-400" />
        </button>
      </div>

      {/* Tasks container */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {children}
      </div>
    </div>
  );
}
