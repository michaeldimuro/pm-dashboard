import React, { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Filter, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, Project, Business, TaskFilters } from '@/types';
import { ASSIGNEES } from '@/types';

interface Column {
  id: string;
  title: string;
  status: Task['status'];
  color: string;
}

// No "Done" column - replaced with "View Done Tasks" link
const defaultColumns: Column[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: '#71717a' },
  { id: 'todo', title: 'To Do', status: 'todo', color: '#3b82f6' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: '#f59e0b' },
  { id: 'blocked', title: 'Blocked', status: 'blocked', color: '#ef4444' },
  { id: 'review', title: 'Review', status: 'review', color: '#8b5cf6' },
];

// Status transition modal for blocked_reason and review_outcome
interface StatusTransition {
  taskId: string;
  newStatus: Task['status'];
  taskTitle: string;
}

// Rejection modal for review tasks
interface RejectionState {
  taskId: string;
  taskTitle: string;
}

export function KanbanBoard() {
  const { currentBusiness, businesses, getBusinessName } = useBusiness();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | 'all'>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TaskFilters>({
    business: 'all',
    priority: 'all',
    assignee: 'all',
    search: '',
  });
  // Status transition state for prompting blocked_reason / review_outcome
  const [statusTransition, setStatusTransition] = useState<StatusTransition | null>(null);
  const [transitionInput, setTransitionInput] = useState('');
  // Rejection state for review tasks
  const [rejectionState, setRejectionState] = useState<RejectionState | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    console.log('[Kanban] useEffect triggered, user:', user ? `${user.full_name} (${user.id})` : 'null');
    if (user) {
      console.log('[Kanban] User exists, fetching projects and tasks...');
      fetchProjects();
      fetchAllTasks();
    } else {
      console.log('[Kanban] No user yet, waiting...');
    }
  }, [user]);

  const fetchProjects = async () => {
    // Fetch all projects across all businesses
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user?.id)
      .eq('status', 'active')
      .order('name');

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const fetchAllTasks = async () => {
    console.log('[Kanban] fetchAllTasks called, user.id:', user?.id);
    setLoading(true);
    
    // Fetch all tasks with project info (for business association)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('user_id', user?.id)
      .neq('status', 'done') // Exclude done tasks from main board
      .order('order', { ascending: true });

    if (error) {
      console.error('[Kanban] Error fetching tasks:', error);
    } else {
      console.log('[Kanban] Tasks fetched:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('[Kanban] Sample task:', data[0].title, '(status:', data[0].status, ')');
      }
      setTasks(data || []);
    }
    setLoading(false);
  };

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Business filter
      if (filters.business !== 'all' && task.project?.business !== filters.business) {
        return false;
      }
      // Priority filter
      if (filters.priority !== 'all' && task.priority !== filters.priority) {
        return false;
      }
      // Assignee filter
      if (filters.assignee !== 'all' && task.assignee_id !== filters.assignee) {
        return false;
      }
      // Search filter
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  const getTasksByStatus = (status: Task['status']) => {
    return filteredTasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overColumn = defaultColumns.find((col) => col.id === over.id);
    if (overColumn && activeTask.status !== overColumn.status) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === active.id ? { ...task, status: overColumn.status } : task
        )
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let newStatus = activeTask.status;
    const overColumn = defaultColumns.find((col) => col.id === over.id);
    if (overColumn) {
      newStatus = overColumn.status;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    // If moving to blocked or review, prompt for reason/outcome
    if (newStatus === 'blocked' || newStatus === 'review') {
      setStatusTransition({
        taskId: active.id as string,
        newStatus,
        taskTitle: activeTask.title,
      });
      setTransitionInput('');
      // Revert the optimistic update until confirmed
      fetchAllTasks();
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', active.id);

    if (error) {
      console.error('Error updating task:', error);
      fetchAllTasks();
    }
  };

  // Handle confirming status transition with reason/outcome
  const handleConfirmTransition = async () => {
    if (!statusTransition || !transitionInput.trim()) return;

    const updateData: Partial<Task> = {
      status: statusTransition.newStatus,
    };

    if (statusTransition.newStatus === 'blocked') {
      updateData.blocked_reason = transitionInput.trim();
    } else if (statusTransition.newStatus === 'review') {
      updateData.review_outcome = transitionInput.trim();
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', statusTransition.taskId);

    if (error) {
      console.error('Error updating task:', error);
    }

    setStatusTransition(null);
    setTransitionInput('');
    fetchAllTasks();
  };

  const handleCancelTransition = () => {
    setStatusTransition(null);
    setTransitionInput('');
  };

  // Handle marking a review task as done
  const handleMarkDone = async (taskId: string) => {
    setIsModalOpen(false); // Close the task modal
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done' })
      .eq('id', taskId);

    if (error) {
      console.error('Error marking task as done:', error);
    }
    fetchAllTasks();
  };

  // Handle opening rejection modal for a review task
  const handleRejectTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setIsModalOpen(false); // Close the task modal
      setRejectionState({ taskId, taskTitle: task.title });
      setRejectionReason('');
    }
  };

  // Handle confirming rejection with reason
  const handleConfirmRejection = async () => {
    if (!rejectionState || !rejectionReason.trim()) return;

    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        rejection_reason: rejectionReason.trim(),
      })
      .eq('id', rejectionState.taskId);

    if (error) {
      console.error('Error rejecting task:', error);
    }

    setRejectionState(null);
    setRejectionReason('');
    fetchAllTasks();
  };

  const handleCancelRejection = () => {
    setRejectionState(null);
    setRejectionReason('');
  };

  // Handle mobile status change
  const handleMobileStatusChange = async (taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // If moving to blocked or review, prompt for reason/outcome
    if (newStatus === 'blocked' || newStatus === 'review') {
      setStatusTransition({
        taskId,
        newStatus,
        taskTitle: task.title,
      });
      setTransitionInput('');
      return;
    }

    // Otherwise, update directly
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task:', error);
    }
    
    fetchAllTasks();
  };

  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;

    const businessChoice = prompt('Business (capture_health, inspectable, synergy):');
    if (!businessChoice || !['capture_health', 'inspectable', 'synergy'].includes(businessChoice)) {
      alert('Invalid business');
      return;
    }

    const { data, error } = await supabase.from('projects').insert({
      name,
      business: businessChoice as Business,
      user_id: user?.id,
    }).select().single();

    if (error) {
      console.error('Error creating project:', error);
    } else if (data) {
      setProjects([...projects, data]);
    }
  };

  const handleTaskClick = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (editingTask) {
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id);

      if (error) {
        console.error('Error updating task:', error);
      } else {
        fetchAllTasks();
      }
    } else {
      // For new tasks, we need a project_id
      if (!taskData.project_id) {
        alert('Please select a project');
        return;
      }
      
      const { error } = await supabase.from('tasks').insert({
        ...taskData,
        user_id: user?.id,
        status: 'backlog',
      });

      if (error) {
        console.error('Error creating task:', error);
      } else {
        fetchAllTasks();
      }
    }
    setIsModalOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task:', error);
    } else {
      fetchAllTasks();
    }
    setIsModalOpen(false);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all' && v !== '').length;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
          <p className="text-gray-400 mt-1">Drag and drop tasks between columns</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
              showFilters || activeFiltersCount > 0
                ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400'
                : 'bg-[#1a1a3a] border-[#2a2a4a] text-gray-400 hover:text-white hover:border-[#3a3a5a]'
            }`}
          >
            <Filter size={18} />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {/* View Done Tasks link */}
          <Link
            to="/kanban/done"
            className="flex items-center gap-2 px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] text-gray-400 hover:text-green-400 hover:border-green-500/50 rounded-lg transition"
          >
            <CheckCircle2 size={18} />
            <span>View Done</span>
          </Link>

          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition shadow-lg shadow-indigo-500/25"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="glass rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-medium">Filters</h3>
            <button
              onClick={() => setFilters({ business: 'all', priority: 'all', assignee: 'all', search: '' })}
              className="text-sm text-gray-400 hover:text-white transition"
            >
              Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search tasks..."
                className="w-full px-3 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Business filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Business</label>
              <select
                value={filters.business || 'all'}
                onChange={(e) => setFilters({ ...filters, business: e.target.value as Business | 'all' })}
                className="w-full px-3 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Businesses</option>
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Priority filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Priority</label>
              <select
                value={filters.priority || 'all'}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value as Task['priority'] | 'all' })}
                className="w-full px-3 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Assignee filter */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Assignee</label>
              <select
                value={filters.assignee || 'all'}
                onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                className="w-full px-3 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Assignees</option>
                {ASSIGNEES.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 mb-4">Create your first project to get started</p>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Create Project
          </button>
        </div>
      ) : isMobile ? (
        // Mobile view without drag-and-drop
        <div className="flex gap-4 overflow-x-auto pb-4">
            {defaultColumns.map((column) => {
              const columnTasks = getTasksByStatus(column.status);
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  count={columnTasks.length}
                >
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        onStatusChange={handleMobileStatusChange}
                        isMobile={isMobile}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>
      ) : (
        // Desktop view with drag-and-drop
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {defaultColumns.map((column) => {
              const columnTasks = getTasksByStatus(column.status);
              return (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  color={column.color}
                  count={columnTasks.length}
                >
                  <SortableContext
                    items={columnTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => handleTaskClick(task)}
                        onStatusChange={handleMobileStatusChange}
                        isMobile={isMobile}
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isDragging isMobile={isMobile} />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
        onMarkDone={editingTask?.status === 'review' ? handleMarkDone : undefined}
        onReject={editingTask?.status === 'review' ? handleRejectTask : undefined}
        task={editingTask}
        projects={projects}
      />

      {/* Status Transition Modal - for blocked_reason / review_outcome */}
      {statusTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancelTransition} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {statusTransition.newStatus === 'blocked' ? '🚫 Moving to Blocked' : '👀 Moving to Review'}
              </h2>
              <button
                onClick={handleCancelTransition}
                className="p-2 hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              Task: <span className="text-white">{statusTransition.taskTitle}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {statusTransition.newStatus === 'blocked' 
                  ? 'What is blocking this task? *'
                  : 'What is the outcome/deliverable? *'}
              </label>
              <textarea
                value={transitionInput}
                onChange={(e) => setTransitionInput(e.target.value)}
                rows={3}
                placeholder={statusTransition.newStatus === 'blocked' 
                  ? 'e.g., Waiting for API access, blocked by dependency...'
                  : 'e.g., PR link, research doc URL, marketing material...'}
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelTransition}
                className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransition}
                disabled={!transitionInput.trim()}
                className={`px-4 py-2 text-white rounded-lg transition ${
                  statusTransition.newStatus === 'blocked'
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-600/50'
                    : 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50'
                } disabled:cursor-not-allowed`}
              >
                {statusTransition.newStatus === 'blocked' ? 'Mark as Blocked' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal - for rejecting review tasks */}
      {rejectionState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleCancelRejection} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                ↩️ Reject Task
              </h2>
              <button
                onClick={handleCancelRejection}
                className="p-2 hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              Task: <span className="text-white">{rejectionState.taskTitle}</span>
            </p>

            <p className="text-gray-500 text-xs mb-4">
              This will move the task back to <span className="text-amber-400">In Progress</span>.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g., Missing edge case handling, needs more tests, UI polish needed..."
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelRejection}
                className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRejection}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition disabled:cursor-not-allowed"
              >
                Reject & Return to In Progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
