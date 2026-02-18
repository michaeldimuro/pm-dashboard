/**
 * useAgentTasks — Fetch tasks assigned to a specific agent
 * Reads from the existing tasks table, filtered by the agent's assignee_user_id
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useOperationsStore } from '@/stores/operationsStore';
import type { Task } from '@/types/index';

interface AgentTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  tasksByStatus: {
    backlog: Task[];
    todo: Task[];
    in_progress: Task[];
    blocked: Task[];
    review: Task[];
    done: Task[];
  };
}

export function useAgentTasks(agentId: string): AgentTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const agentProfile = useOperationsStore((state) => state.agentProfiles[agentId]);

  useEffect(() => {
    if (!agentProfile?.assignee_user_id) {
      setLoading(false);
      return;
    }

    const assigneeId = agentProfile.assignee_user_id;
    let mounted = true;

    const fetchTasks = async () => {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .eq('assignee_id', assigneeId)
        .order('updated_at', { ascending: false })
        .limit(100);

      if (!mounted) return;

      if (fetchError) {
        console.error('[useAgentTasks] Error fetching tasks:', fetchError);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      setTasks(data || []);
      setError(null);
      setLoading(false);
    };

    fetchTasks();

    // Subscribe to realtime changes on tasks for this assignee
    const channel = supabase
      .channel(`agent-tasks-${agentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assignee_id=eq.${assigneeId}`,
        },
        () => {
          // Refetch on any change
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [agentId, agentProfile?.assignee_user_id]);

  const tasksByStatus = {
    backlog: tasks.filter((t) => t.status === 'backlog'),
    todo: tasks.filter((t) => t.status === 'todo'),
    in_progress: tasks.filter((t) => t.status === 'in_progress'),
    blocked: tasks.filter((t) => t.status === 'blocked'),
    review: tasks.filter((t) => t.status === 'review'),
    done: tasks.filter((t) => t.status === 'done'),
  };

  return { tasks, loading, error, tasksByStatus };
}
