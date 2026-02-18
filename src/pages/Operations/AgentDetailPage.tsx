/**
 * AgentDetailPage — Per-agent view with kanban + activity log + stats
 * Route: /operations/:agentId
 */

import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useAgentProfile, useLiveFeed } from '@/stores/operationsStore';
import { useAgentTasks } from '@/hooks/useAgentTasks';
import { AgentHeader } from '@/components/Operations/AgentHeader';
import { AgentKanban } from '@/components/Operations/AgentKanban';
import { ActivityFeed } from '@/components/Operations/ActivityFeed';

export const AgentDetailPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { loading } = useSupabaseRealtime();
  const profile = useAgentProfile(agentId || '');
  const liveFeed = useLiveFeed();
  const { tasksByStatus, loading: tasksLoading } = useAgentTasks(agentId || '');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          <span className="text-gray-400 text-sm">Loading agent...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/operations" replace />;
  }

  const totalActiveTasks =
    tasksByStatus.todo.length +
    tasksByStatus.in_progress.length +
    tasksByStatus.review.length;

  const totalDone = tasksByStatus.done.length;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <AgentHeader profile={profile} />

        {/* Description */}
        {profile.description && (
          <p className="text-gray-400 text-sm -mt-2 ml-[72px]">{profile.description}</p>
        )}

        {/* Kanban */}
        <AgentKanban tasksByStatus={tasksByStatus} loading={tasksLoading} />

        {/* Activity + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Activity Log (2/3 width) */}
          <div className="lg:col-span-2">
            <ActivityFeed events={liveFeed} maxItems={30} agentFilter={agentId} />
          </div>

          {/* Stats Panel (1/3 width) */}
          <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl">
            <div className="px-4 py-3 border-b border-[#1e1e3a]">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Stats
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Active Tasks</span>
                <span className="text-sm font-mono text-white">{totalActiveTasks}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Completed</span>
                <span className="text-sm font-mono text-white">
                  {profile.total_tasks_completed || totalDone}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Default Model</span>
                <span className="text-sm font-mono text-gray-300">{profile.default_model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-400">Est. Cost (total)</span>
                <span className="text-sm font-mono text-white">
                  ${(profile.total_cost_cents / 100).toFixed(2)}
                </span>
              </div>
              {profile.last_active_at && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Last Active</span>
                  <span className="text-sm font-mono text-gray-300">
                    {new Date(profile.last_active_at).toLocaleDateString()}
                  </span>
                </div>
              )}
              {profile.capabilities.length > 0 && (
                <div className="pt-2 border-t border-[#1e1e3a]">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Capabilities</span>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-[#1e1e3a] text-gray-400"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
