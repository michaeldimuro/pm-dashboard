/**
 * useTaskFlow - Transform and manage task data for kanban display
 * Provides helpers for moving tasks between statuses and organizing them
 */

import { useCallback, useMemo } from 'react';
import type { Task, TaskFlow, TaskStatus, UseTaskFlowReturn } from '../types/operations';
import { useOperationsStore } from './useOperationsStore';

/**
 * Hook for managing task flow state and transformations
 */
export const useTaskFlow = (): UseTaskFlowReturn => {
  const { taskFlow, updateTaskFlow } = useOperationsStore();
  
  /**
   * Move a task from one status to another
   */
  const moveTask = useCallback(
    (taskId: string, fromStatus: TaskStatus, toStatus: TaskStatus) => {
      if (fromStatus === toStatus) return;
      
      // Find the task
      const tasks = taskFlow[fromStatus];
      const taskIndex = tasks.findIndex((t) => t.id === taskId);
      
      if (taskIndex === -1) {
        console.warn(`[TaskFlow] Task ${taskId} not found in ${fromStatus}`);
        return;
      }
      
      const task = tasks[taskIndex];
      
      // Create new task flow with task moved
      const newTaskFlow: TaskFlow = {
        ...taskFlow,
        [fromStatus]: tasks.filter((t) => t.id !== taskId),
        [toStatus]: [
          ...taskFlow[toStatus],
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
      return taskFlow[status] || [];
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
        .filter((task) => task.priority === 'urgent' || task.priority === 'high')
        .sort((a, b) => {
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
        .filter((task) => task.priority === priority),
    [taskFlow]
  );
  
  /**
   * Get tasks assigned to a specific user
   */
  const getTasksByAssignee = useCallback(
    (assigneeId: string): Task[] =>
      Object.values(taskFlow)
        .flat()
        .filter((task) => task.assigneeId === assigneeId),
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
        backlog: taskFlow.backlog.filter((t) => t.id !== taskId),
        todo: taskFlow.todo.filter((t) => t.id !== taskId),
        inProgress: taskFlow.inProgress.filter((t) => t.id !== taskId),
        review: taskFlow.review.filter((t) => t.id !== taskId),
        done: taskFlow.done.filter((t) => t.id !== taskId),
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
      let found = false;
      const newTaskFlow: TaskFlow = {
        backlog: taskFlow.backlog.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        todo: taskFlow.todo.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        inProgress: taskFlow.inProgress.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        review: taskFlow.review.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
        done: taskFlow.done.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date() } : t
        ),
      };
      
      if (Object.values(newTaskFlow).some((tasks) =>
        tasks.some((t) => t.id === taskId && t !== tasks.find(x => x.id === taskId))
      )) {
        found = true;
      }
      
      if (found) {
        updateTaskFlow(newTaskFlow);
      } else {
        console.warn(`[TaskFlow] Task ${taskId} not found for update`);
      }
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
      allTasks.find((t) => t.id === taskId),
    [allTasks]
  );
  
  return {
    taskFlow,
    moveTask,
    getTasksByStatus,
    // Additional helpers
    taskCountByStatus: taskCountByStatus as any,
    totalTasks,
    completionPercent,
    highPriorityTasks,
    getTasksByPriority: getTasksByPriority as any,
    getTasksByAssignee: getTasksByAssignee as any,
    addTask: addTask as any,
    removeTask: removeTask as any,
    updateTask: updateTask as any,
    allTasks,
    getTaskById: getTaskById as any,
  };
};
