import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Task, Lead, CalendarEvent } from '@/types';

interface Stats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalLeads: number;
  upcomingEvents: number;
}

export function DashboardPage() {
  const { currentBusiness, businesses } = useBusiness();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalLeads: 0,
    upcomingEvents: 0,
  });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const currentBusinessInfo = businesses.find(b => b.id === currentBusiness);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, currentBusiness]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch tasks for current business
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*, projects!inner(*)')
        .eq('projects.business', currentBusiness)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch leads for current business
      const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .eq('business', currentBusiness)
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

      // Calculate stats
      const allTasks = tasks || [];
      const allLeads = leads || [];

      setStats({
        totalTasks: allTasks.length,
        completedTasks: allTasks.filter(t => t.status === 'done').length,
        pendingTasks: allTasks.filter(t => t.status !== 'done').length,
        totalLeads: allLeads.length,
        upcomingEvents: events?.length || 0,
      });

      setRecentTasks(tasks || []);
      setRecentLeads(leads || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      icon: CheckCircle2,
      color: 'bg-blue-500',
      trend: '+12%',
      trendUp: true,
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      icon: TrendingUp,
      color: 'bg-green-500',
      trend: '+8%',
      trendUp: true,
    },
    {
      title: 'Pending',
      value: stats.pendingTasks,
      icon: Clock,
      color: 'bg-orange-500',
      trend: '-3%',
      trendUp: false,
    },
    {
      title: 'Active Leads',
      value: stats.totalLeads,
      icon: Users,
      color: 'bg-purple-500',
      trend: '+15%',
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Overview for{' '}
          <span
            className="font-medium"
            style={{ color: currentBusinessInfo?.color }}
          >
            {currentBusinessInfo?.name}
          </span>
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="text-white" size={24} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trendUp ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {stat.trendUp ? (
                  <ArrowUpRight size={16} />
                ) : (
                  <ArrowDownRight size={16} />
                )}
                {stat.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-500 text-sm">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentTasks.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No tasks yet. Create your first task!
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        task.status === 'done'
                          ? 'bg-green-500'
                          : task.status === 'in_progress'
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <span className="text-gray-900">{task.title}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      task.priority === 'urgent'
                        ? 'bg-red-100 text-red-700'
                        : task.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Leads</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {recentLeads.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No leads yet. Start tracking your leads!
              </div>
            ) : (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition"
                >
                  <div>
                    <p className="font-medium text-gray-900">{lead.name}</p>
                    <p className="text-sm text-gray-500">{lead.source}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      lead.status === 'won'
                        ? 'bg-green-100 text-green-700'
                        : lead.status === 'lost'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {lead.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
          <Calendar size={20} className="text-gray-400" />
        </div>
        <div className="p-6">
          {stats.upcomingEvents === 0 ? (
            <p className="text-center text-gray-500">
              No upcoming events scheduled
            </p>
          ) : (
            <p className="text-gray-600">
              You have {stats.upcomingEvents} upcoming event
              {stats.upcomingEvents !== 1 ? 's' : ''} this week
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
