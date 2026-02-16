import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Rocket,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, Lead, Business } from '@/types';
import { ASSIGNEES } from '@/types';

interface Stats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalLeads: number;
  upcomingEvents: number;
}

interface BusinessStats {
  business: Business;
  name: string;
  color: string;
  tasks: number;
  completed: number;
}

export function DashboardPage() {
  const { businesses, getBusinessName, getBusinessColor } = useBusiness();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalLeads: 0,
    upcomingEvents: 0,
  });
  const [businessStats, setBusinessStats] = useState<BusinessStats[]>([]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Dashboard] useEffect triggered, user:', user ? `${user.full_name} (${user.id})` : 'null');
    
    if (user) {
      console.log('[Dashboard] User exists, fetching data...');
      fetchDashboardData();
    } else {
      console.log('[Dashboard] No user yet, waiting...');
    }
    
    // Safety timeout: if dashboard doesn't load within 10 seconds, stop loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[Dashboard] ⚠️ Loading timeout (10s), stopping loading state');
        console.warn('[Dashboard] User state at timeout:', user ? 'exists' : 'null');
        setLoading(false);
      }
    }, 10000);
    
    return () => clearTimeout(timeout);
  }, [user, loading]);

  const fetchDashboardData = async () => {
    console.log('[Dashboard] fetchDashboardData called, user.id:', user?.id);
    setLoading(true);
    try {
      // Fetch ALL tasks across all businesses
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*, project:projects(*)')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      if (tasksError) {
        console.error('[Dashboard] Error fetching tasks:', tasksError);
      } else {
        console.log('[Dashboard] Tasks fetched:', allTasks?.length || 0);
      }

      // Fetch ALL leads across all businesses
      const { data: allLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch upcoming events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      const tasks = allTasks || [];
      const leads = allLeads || [];

      // Calculate overall stats
      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter(t => t.status === 'done').length,
        inProgressTasks: tasks.filter(t => t.status === 'in_progress' || t.status === 'review').length,
        totalLeads: leads.length,
        upcomingEvents: events?.length || 0,
      });

      // Calculate per-business stats
      const bStats: BusinessStats[] = businesses.map(b => {
        const bTasks = tasks.filter(t => t.project?.business === b.id);
        return {
          business: b.id,
          name: b.name,
          color: b.color,
          tasks: bTasks.length,
          completed: bTasks.filter(t => t.status === 'done').length,
        };
      });
      setBusinessStats(bStats);

      // Get recent non-done tasks
      setRecentTasks(tasks.filter(t => t.status !== 'done').slice(0, 5));
      setRecentLeads(leads);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssigneeName = (assigneeId?: string) => {
    if (!assigneeId) return 'Unassigned';
    const assignee = ASSIGNEES.find(a => a.id === assigneeId);
    return assignee?.name || assigneeId;
  };

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckCircle2,
      color: 'from-blue-500 to-indigo-600',
      bgGlow: 'bg-blue-500/10',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
      bgGlow: 'bg-green-500/10',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      bgGlow: 'bg-amber-500/10',
    },
    {
      title: 'Active Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'from-purple-500 to-violet-600',
      bgGlow: 'bg-purple-500/10',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 gradient-accent rounded-xl flex items-center justify-center">
          <Rocket size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Mission Control</h1>
          <p className="text-gray-400">Aggregate overview across all businesses</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="glass rounded-xl p-6 relative overflow-hidden"
          >
            <div className={`absolute inset-0 ${stat.bgGlow} opacity-50`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                >
                  <stat.icon className="text-white" size={24} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Business breakdown */}
      <div className="glass rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Business Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {businessStats.map((b) => (
            <div
              key={b.business}
              className="bg-[#1a1a3a] rounded-lg p-4 border-l-4"
              style={{ borderLeftColor: b.color }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: b.color }}
                />
                <span className="font-medium text-white">{b.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{b.tasks} tasks</span>
                <span className="text-green-400">{b.completed} done</span>
              </div>
              {b.tasks > 0 && (
                <div className="mt-2 h-2 bg-[#2a2a4a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(b.completed / b.tasks) * 100}%`,
                      backgroundColor: b.color,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="glass rounded-xl">
          <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Tasks</h2>
            <Link to="/kanban" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#2a2a4a]">
            {recentTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No tasks yet. Create your first task!
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a3a]/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: task.project?.business
                          ? getBusinessColor(task.project.business)
                          : '#6366f1'
                      }}
                    />
                    <div className="min-w-0">
                      <span className="text-white block truncate">{task.title}</span>
                      <span className="text-xs text-gray-500">
                        {task.ticket_number && `#${task.ticket_number} • `}
                        {getAssigneeName(task.assignee_id)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2 ${
                      task.priority === 'urgent'
                        ? 'bg-red-500/20 text-red-400'
                        : task.priority === 'high'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="glass rounded-xl">
          <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent Leads</h2>
            <Link to="/leads" className="text-sm text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[#2a2a4a]">
            {recentLeads.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No leads yet. Start tracking your leads!
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1a3a]/50 transition"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white truncate">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.source}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getBusinessColor(lead.business) }}
                    />
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        lead.status === 'won'
                          ? 'bg-green-500/20 text-green-400'
                          : lead.status === 'lost'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {lead.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="glass rounded-xl">
        <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between">
          <h2 className="font-semibold text-white">Upcoming Events</h2>
          <Calendar size={20} className="text-gray-500" />
        </div>
        <div className="p-6">
          {stats.upcomingEvents === 0 ? (
            <p className="text-center text-gray-500">
              No upcoming events scheduled
            </p>
          ) : (
            <p className="text-gray-300">
              You have <span className="text-indigo-400 font-medium">{stats.upcomingEvents}</span> upcoming event
              {stats.upcomingEvents !== 1 ? 's' : ''} this week
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
