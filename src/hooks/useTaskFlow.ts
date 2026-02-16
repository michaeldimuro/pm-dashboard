/**
 * useTaskFlow - Transform and manage task data for kanban display
 * Provides helpers for moving tasks between statuses and organizing them
 */

import { useCallback, useMemo } from 'react';
import type { Task, TaskFlow, TaskStatus } from '../types/operations';
import { useOperationsStore } from './useOperationsStore';

/**
 * Extended return type for useTaskFlow with all helpers
 */
interface UseTaskFlowExtended {
  taskFlow: TaskFlow;
  moveTask: (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  taskCountByStatus: Record<'backlog' | 'todo' | 'inProgress' | 'review' | 'done', number>;
  totalTasks: number;
  completionPercent: number;
  highPriorityTasks: Task[];
  getTasksByPriority: (priority: string) => Task[];
  getTasksByAssignee: (assigneeId: string) => Task[];
  addTask: (task: Task) => void;
  removeTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  allTasks: Task[];
  getTaskById: (taskId: string) => Task | undefined;
}

/**
 * Hook for managing task flow state and transformations
 */
export const useTaskFlow = (): UseTaskFlowExtended => {
  const { taskFlow, updateTaskFlow } = useOperationsStore();
  
  /**
   * Move a task from one status to another
   */
  const moveTask = useCallback(
    (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
      if (fromStatus === toStatus) return;
      
      // Get the task arrays - handle both camelCase and snake_case
      const fromStatusKey = (fromStatus === 'in_progress' ? 'inProgress' : fromStatus) as keyof TaskFlow;
      const toStatusKey = (toStatus === 'in_progress' ? 'inProgress' : toStatus) as keyof TaskFlow;
      
      const tasks = taskFlow[fromStatusKey];
      const taskIndex = tasks.findIndex((t: Task) => t.id === taskId);
      
      if (taskIndex === -1) {
        console.warn(`[TaskFlow] Task ${taskId} not found in ${fromStatus}`);
        return;
      }
      
      const task = tasks[taskIndex];
      
      // Create new task flow with task moved
      const newTaskFlow: TaskFlow = {
        ...taskFlow,
        [fromStatusKey]: tasks.filter((t: Task) => t.id !== taskId),
        [toStatusKey]: [
          ...taskFlow[toStatusKey],
          {
            ...task,
            status: toStatus,
            updatedAt: new Date(),
          },
        ],
      };
      
      updateTaskFlow(newTaskFlow);
    },
    [taskFlow, updateTaskFlow]
  );
  
  /**
   * Get all tasks for a specific status
   */
  const getTasksByStatus = useCallback(
    (status: TaskStatus): Task[] => {
      const statusKey = (status === 'in_progress' ? 'inProgress' : status) as keyof TaskFlow;
      return taskFlow[statusKey] || [];
    },
    [taskFlow]
  );
  
  /**
   * Count tasks by status
   */
  const taskCountByStatus = useMemo(
    () => ({
      backlog: taskFlow.backlog.length,
      todo: taskFlow.todo.length,
      inProgress: taskFlow.inProgress.length,
      review: taskFlow.review.length,
      done: taskFlow.done.length,
    }),
    [taskFlow]
  );
  
  /**
   * Get total tasks across all statuses
   */
  const totalTasks = useMemo(
    () => Object.values(taskCountByStatus).reduce((sum, count) => sum + count, 0),
    [taskCountByStatus]
  );
  
  /**
   * Get completion percentage
   */
  const completionPercent = useMemo(
    () =>
      totalTasks === 0 ? 0 : Math.round((taskCountByStatus.done / totalTasks) * 100),
    [taskCountByStatus, totalTasks]
  );
  
  /**
   * Get high priority tasks
   */
  const highPriorityTasks = useMemo(
    () =>
      Object.values(taskFlow)
        .flat()
        .filter((task: Task) => task.priority === 'urgent' || task.priority === 'high')
        .sort((a: Task, b: Task) => {
          if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
          if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
          return 0;
        }),
    [taskFlow]
  );
  
  /**
   * Get tasks by priority across all statuses
   */
  const getTasksByPriority = useCallback(
    (priority: string): Task[] =>
      Object.values(taskFlow)
        .flat()
        .filter((task: Task) => task.priority === priority),
    [taskFlow]
  );
  
  /**
   * Get tasks assigned to a specific user
   */
  const getTasksByAssignee = useCallback(
    (assigneeId: string): Task[] =>
      Object.values(taskFlow)
        .flat()
        .filter((task: Task) => task.assigneeId === assigneeId),
    [taskFlow]
  );
  
  /**
   * Add a new task to backlog
   */
  const addTask = useCallback(
    (task: Task) => {
      updateTaskFlow({
        ...taskFlow,
        backlog: [...taskFlow.backlog, task],
      });
    },
    [taskFlow, updateTaskFlow]
  );
  
  /**
   * Remove a task
   */
  const removeTask = useCallback(
    (taskId: string) => {
      const newTaskFlow: TaskFlow = {
        backlog: taskFlow.backlog.filter((t: Task) => t.id !== taskId),
        todo: taskFlow.todo.filter((t: Task) => t.id !== taskId),
        inProgress: taskFlow.inProgress.filter((t: Task) => t.id !== taskId),
        review: taskFlow.review.filter((t: Task) => t.id !== taskId),
        done: taskFlow.done.filter((t: Task) => t.id !== taskId),
      };
      updateTaskFlow(newTaskFlow);
    },
    [taskFlow, updateTaskFlow]
  );
  
  /**
   * Update a task's properties
   */
  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      const newTaskFlow: TaskFlow = {
        backlog: taskFlow.backlog.map((t: Task) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        todo: taskFlow.todo.map((t: Task) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        inProgress: taskFlow.inProgress.map((t: Task) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        review: taskFlow.review.map((t: Task) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        done: taskFlow.done.map((t: Task) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
      };
      
      updateTaskFlow(newTaskFlow);
    },
    [taskFlow, updateTaskFlow]
  );
  
  /**
   * Get all tasks across all statuses
   */
  const allTasks = useMemo(
    () => Object.values(taskFlow).flat(),
    [taskFlow]
  );
  
  /**
   * Find a task by ID
   */
  const getTaskById = useCallback(
    (taskId: string): Task | undefined =>
      allTasks.find((t: Task) => t.id === taskId),
    [allTasks]
  );
  
  return {
    taskFlow,
    moveTask,
    getTasksByStatus,
    taskCountByStatus,
    totalTasks,
    completionPercent,
    highPriorityTasks,
    getTasksByPriority,
    getTasksByAssignee,
    addTask,
    removeTask,
    updateTask,
    allTasks,
    getTaskById,
  };
};
