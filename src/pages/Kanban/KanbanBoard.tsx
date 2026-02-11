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
  { id: 'review', title: 'Review', status: 'review', color: '#8b5cf6' },
];

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchAllTasks();
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
    setLoading(true);
    // Fetch all tasks with project info (for business association)
    const { data, error } = await supabase
      .from('tasks')
      .select('*, project:projects(*)')
      .eq('user_id', user?.id)
      .neq('status', 'done') // Exclude done tasks from main board
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
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

    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', active.id);

    if (error) {
      console.error('Error updating task:', error);
      fetchAllTasks();
    }
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
      ) : (
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
                      />
                    ))}
                  </SortableContext>
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && <TaskCard task={activeTask} isDragging />}
          </DragOverlay>
        </DndContext>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={editingTask ? () => handleDeleteTask(editingTask.id) : undefined}
        task={editingTask}
        projects={projects}
      />
    </div>
  );
}
