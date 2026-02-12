import React, { useState, useEffect } from 'react';
import { X, Trash2, Send, Clock, MessageSquare, Lock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { Task, TaskComment, Project } from '@/types';
import { ASSIGNEES } from '@/types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  onDelete?: () => void;
  task?: Task | null;
  projects: Project[];
}

export function TaskModal({ isOpen, onClose, onSave, onDelete, task, projects }: TaskModalProps) {
  const { user } = useAuth();
  const { getBusinessName, getBusinessColor } = useBusiness();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [labels, setLabels] = useState('');
  const [projectId, setProjectId] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [reviewOutcome, setReviewOutcome] = useState('');
  
  // Comments
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  
  // Read-only check: title/description locked after backlog
  const isContentLocked = Boolean(task && task.status !== 'backlog');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setAssigneeId(task.assignee_id || '');
      setLabels(task.labels?.join(', ') || '');
      setProjectId(task.project_id || '');
      setBlockedReason(task.blocked_reason || '');
      setReviewOutcome(task.review_outcome || '');
      fetchComments(task.id);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setAssigneeId('');
      setLabels('');
      setProjectId(projects[0]?.id || '');
      setBlockedReason('');
      setReviewOutcome('');
      setComments([]);
    }
  }, [task, isOpen, projects]);

  const fetchComments = async (taskId: string) => {
    setLoadingComments(true);
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, user:users(full_name)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
    }
    setLoadingComments(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !task) return;

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: task.id,
        user_id: user?.id,
        text: newComment.trim(),
      })
      .select('*, user:users(full_name)')
      .single();

    if (error) {
      console.error('Error adding comment:', error);
    } else if (data) {
      setComments([...comments, data]);
      setNewComment('');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description: description || undefined,
      priority,
      due_date: dueDate || undefined,
      assignee_id: assigneeId || undefined,
      labels: labels ? labels.split(',').map((l) => l.trim()).filter(Boolean) : [],
      project_id: projectId || undefined,
      blocked_reason: blockedReason || undefined,
      review_outcome: reviewOutcome || undefined,
    });
  };

  const selectedProject = projects.find(p => p.id === projectId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a4a] sticky top-0 bg-[#12122a] z-10">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {task ? 'Edit Task' : 'New Task'}
            </h2>
            {task?.ticket_number && (
              <span className="text-sm text-gray-500 font-mono">#{task.ticket_number}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#1a1a3a] rounded-lg transition text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project selection (for new tasks) */}
          {!task && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project *
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} ({getBusinessName(project.business)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show business badge for existing tasks */}
          {task && selectedProject && (
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: `${getBusinessColor(selectedProject.business)}20`,
                  color: getBusinessColor(selectedProject.business),
                }}
              >
                {getBusinessName(selectedProject.business)}
              </span>
              <span className="text-gray-400 text-sm">{selectedProject.name}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Title *
              {isContentLocked && (
                <span className="ml-2 text-xs text-amber-400/80">(locked after backlog)</span>
              )}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={isContentLocked}
              className={`w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                isContentLocked ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
              {isContentLocked && (
                <span className="ml-2 text-xs text-amber-400/80">(locked after backlog)</span>
              )}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={isContentLocked}
              className={`w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                isContentLocked ? 'opacity-60 cursor-not-allowed' : ''
              }`}
              placeholder="Task description (optional)"
            />
          </div>

          {/* Priority, Due Date, Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {ASSIGNEES.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Labels
            </label>
            <input
              type="text"
              value={labels}
              onChange={(e) => setLabels(e.target.value)}
              className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="bug, feature, urgent (comma separated)"
            />
          </div>

          {/* Blocked Reason - shown when task is blocked */}
          {task?.status === 'blocked' && blockedReason && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-red-400 mb-2">
                🚫 Blocked Reason
              </label>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{blockedReason}</p>
            </div>
          )}

          {/* Review Outcome - shown when task is in review or done */}
          {(task?.status === 'review' || task?.status === 'done') && reviewOutcome && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <label className="block text-sm font-medium text-purple-400 mb-2">
                📋 Review Outcome
              </label>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{reviewOutcome}</p>
            </div>
          )}

          {/* Last Updated */}
          {task && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              <span>Last updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
            </div>
          )}

          {/* Comments Section */}
          {task && (
            <div className="border-t border-[#2a2a4a] pt-5">
              <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                <MessageSquare size={16} />
                Comments ({comments.length})
              </h3>

              {/* Comments list */}
              <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                {loadingComments ? (
                  <p className="text-gray-500 text-sm">Loading comments...</p>
                ) : comments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No comments yet</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-[#1a1a3a] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-6 h-6 rounded-full gradient-accent flex items-center justify-center text-xs text-white">
                          {(comment.user as any)?.full_name?.charAt(0) || 'U'}
                        </span>
                        <span className="text-sm font-medium text-white">
                          {(comment.user as any)?.full_name || 'User'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 pl-8">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add comment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#2a2a4a]">
            {task && onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 size={18} />
                Delete
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
              >
                {task ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
