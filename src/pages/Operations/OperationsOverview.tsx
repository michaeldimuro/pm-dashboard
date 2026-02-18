/**
 * OperationsOverview — Agent grid + live feed + metrics
 * Route: /operations
 */

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useSupabaseRealtime } from '@/hooks/useSupabaseRealtime';
import { useOperationsStore, useAgentProfiles, useLiveFeed, useAggregatedMetrics } from '@/stores/operationsStore';
import { supabase } from '@/lib/supabase';
import { AgentCard } from '@/components/Operations/AgentCard';
import { ActivityFeed } from '@/components/Operations/ActivityFeed';
import { MetricsPanel } from '@/components/Operations/MetricsPanel';
import type { AgentProfile } from '@/types/operations';

export const OperationsOverview: React.FC = () => {
  const { isConnected, loading } = useSupabaseRealtime();
  const agentProfiles = useAgentProfiles();
  const liveFeed = useLiveFeed();
  const aggregatedMetrics = useAggregatedMetrics();
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  // Fetch active task counts per agent
  useEffect(() => {
    const fetchTaskCounts = async () => {
      const profiles = Object.values(agentProfiles);
      const counts: Record<string, number> = {};

      for (const profile of profiles) {
        if (!profile.assignee_user_id) {
          counts[profile.agent_id] = 0;
          continue;
        }
        const { count } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('assignee_id', profile.assignee_user_id)
          .in('status', ['todo', 'in_progress', 'review']);

        counts[profile.agent_id] = count || 0;
      }

      setTaskCounts(counts);
    };

    if (Object.keys(agentProfiles).length > 0) {
      fetchTaskCounts();
    }
  }, [agentProfiles]);

  // Fetch aggregated metrics from agent_metrics table
  useEffect(() => {
    const fetchMetrics = async () => {
      const store = useOperationsStore.getState();

      const today = new Date().toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: metrics } = await supabase
        .from('agent_metrics')
        .select('*')
        .gte('metric_date', monthAgo)
        .order('metric_date', { ascending: false });

      if (!metrics || metrics.length === 0) return;

      const agg = {
        today: { tasks: 0, sessions: 0, cost_cents: 0 },
        week: { tasks: 0, sessions: 0, cost_cents: 0 },
        month: { tasks: 0, sessions: 0, cost_cents: 0 },
      };

      for (const m of metrics) {
        // Month
        agg.month.tasks += m.tasks_completed;
        agg.month.sessions += m.sessions_count;
        agg.month.cost_cents += m.cost_cents;

        // Week
        if (m.metric_date >= weekAgo) {
          agg.week.tasks += m.tasks_completed;
          agg.week.sessions += m.sessions_count;
          agg.week.cost_cents += m.cost_cents;
        }

        // Today
        if (m.metric_date === today) {
          agg.today.tasks += m.tasks_completed;
          agg.today.sessions += m.sessions_count;
          agg.today.cost_cents += m.cost_cents;
        }
      }

      store.setAggregatedMetrics(agg);
    };

    fetchMetrics();
  }, []);

  const profiles = Object.values(agentProfiles);
  // Sort: main first, then alphabetical
  const sortedProfiles = profiles.sort((a, b) => {
    if (a.agent_id === 'main') return -1;
    if (b.agent_id === 'main') return 1;
    return a.display_name.localeCompare(b.display_name);
  });

  // Get current activity from live feed for each agent
  const getAgentActivity = (agentId: string): string | undefined => {
    const event = liveFeed.find(
      (e) => e.agent_id === agentId && e.type === 'agent.work_activity'
    );
    return event ? String(event.payload?.activity || '') : undefined;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          <span className="text-gray-400 text-sm">Connecting to Operations Center...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <div className="border-b border-[#1e1e3a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-white">Operations Center</h1>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi size={16} className="text-green-400" />
                <span className="text-xs text-green-400">Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-red-400" />
                <span className="text-xs text-red-400">Disconnected</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProfiles.length === 0 ? (
            <div className="col-span-3 bg-[#12122a] border border-[#1e1e3a] rounded-xl p-8 text-center">
              <p className="text-gray-500">No agents configured. Run the database migration to set up agent profiles.</p>
            </div>
          ) : (
            sortedProfiles.map((profile) => (
              <AgentCard
                key={profile.agent_id}
                profile={profile}
                activeTasks={taskCounts[profile.agent_id] || 0}
                currentActivity={getAgentActivity(profile.agent_id)}
              />
            ))
          )}
        </div>

        {/* Live Feed + Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivityFeed events={liveFeed} maxItems={20} />
          <MetricsPanel metrics={aggregatedMetrics} />
        </div>
      </div>
    </div>
  );
};
