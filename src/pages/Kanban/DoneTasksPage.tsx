import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Calendar, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { Task } from '@/types';
import { ASSIGNEES } from '@/types';

export function DoneTasksPage() {
  const { user } = useAuth();
  const { getBusinessName, getBusinessColor } = useBusiness();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDoneTasks();
    }
  }, [user]);

  const fetchDoneTasks = async () => {
    setLoading(true);
    // Fetch done tasks sorted by most recently updated
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('user_id', user?.id)
      .eq('status', 'done')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching done tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    const assignee = ASSIGNEES.find(a => a.id === assigneeId);
    return assignee?.name || assigneeId;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/kanban"
          className="p-2 hover:bg-[#1a1a3a] rounded-lg text-gray-400 hover:text-white transition"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="text-green-400" size={28} />
            Completed Tasks
          </h1>
          <p className="text-gray-400 mt-1">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''} completed • Sorted by most recent
          </p>
        </div>
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <CheckCircle2 size={48} className="text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No completed tasks yet</h3>
          <p className="text-gray-400">Complete some tasks to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="glass rounded-xl p-4 hover:bg-[#1a1a3a]/50 transition"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
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
                          backgroundColor: `${getBusinessColor(task.project.business)}20`,
                          color: getBusinessColor(task.project.business),
                        }}
                      >
                        {getBusinessName(task.project.business)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-medium text-white line-through opacity-70">{task.title}</h3>
                  
                  {task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                  )}

                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    {/* Assignee */}
                    <span className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-indigo-600/30 flex items-center justify-center text-[10px] text-indigo-400">
                        {getAssigneeName(task.assignee_id).charAt(0)}
                      </span>
                      {getAssigneeName(task.assignee_id)}
                    </span>

                    {/* Updated at */}
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Completed {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}
                    </span>

                    {/* Due date if exists */}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Due {format(new Date(task.due_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                </div>

                <CheckCircle2 className="text-green-400 flex-shrink-0" size={24} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
