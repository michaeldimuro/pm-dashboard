import React, { useState, useEffect } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, MoreHorizontal } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import { TaskModal } from './TaskModal';
import { useBusiness } from '@/contexts/BusinessContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Task, Project } from '@/types';

interface Column {
  id: string;
  title: string;
  status: Task['status'];
  color: string;
}

const defaultColumns: Column[] = [
  { id: 'backlog', title: 'Backlog', status: 'backlog', color: '#71717a' },
  { id: 'todo', title: 'To Do', status: 'todo', color: '#3b82f6' },
  { id: 'in_progress', title: 'In Progress', status: 'in_progress', color: '#f59e0b' },
  { id: 'review', title: 'Review', status: 'review', color: '#8b5cf6' },
  { id: 'done', title: 'Done', status: 'done', color: '#22c55e' },
];

export function KanbanBoard() {
  const { currentBusiness } = useBusiness();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

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
    }
  }, [user, currentBusiness]);

  useEffect(() => {
    if (selectedProject) {
      fetchTasks();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('business', currentBusiness)
      .eq('user_id', user?.id)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchTasks = async () => {
    if (!selectedProject) return;

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', selectedProject)
      .order('order', { ascending: true });

    if (error) {
      console.error('Error fetching tasks:', error);
    } else {
      setTasks(data || []);
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter((task) => task.status === status);
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

    // Check if dropping over a column
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

    // Determine the new status
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

    // Update in database
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', active.id);

    if (error) {
      console.error('Error updating task:', error);
      fetchTasks(); // Revert on error
    }
  };

  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;

    const { data, error } = await supabase.from('projects').insert({
      name,
      business: currentBusiness,
      user_id: user?.id,
    }).select().single();

    if (error) {
      console.error('Error creating project:', error);
    } else if (data) {
      setProjects([...projects, data]);
      setSelectedProject(data.id);
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
      // Update existing task
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id);

      if (error) {
        console.error('Error updating task:', error);
      } else {
        fetchTasks();
      }
    } else {
      // Create new task
      const { error } = await supabase.from('tasks').insert({
        ...taskData,
        project_id: selectedProject,
        user_id: user?.id,
        status: 'backlog',
      });

      if (error) {
        console.error('Error creating task:', error);
      } else {
        fetchTasks();
      }
    }
    setIsModalOpen(false);
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task:', error);
    } else {
      fetchTasks();
    }
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kanban Board</h1>
          <p className="text-gray-500 mt-1">Drag and drop tasks between columns</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Project selector */}
          <select
            value={selectedProject || ''}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleCreateProject}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="New Project"
          >
            <Plus size={20} />
          </button>

          <button
            onClick={handleCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">Create your first project to get started</p>
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Create Project
          </button>
        </div>
      ) : (
        /* Kanban columns */
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
      />
    </div>
  );
}
