'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAlerts } from '@/hooks/useAlerts';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import Header from '@/components/dashboard/Header';
import { AlertCard } from '@/components/health/AlertCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import { toast } from 'sonner';
import type { ChurnAlert, AlertPriority, AlertStatus } from '@/types';

const PRIORITY_TABS = [
  { value: 'all', label: 'All', icon: Bell },
  { value: 'critical', label: 'Critical', icon: AlertOctagon },
  { value: 'medium', label: 'Medium', icon: AlertTriangle },
  { value: 'low', label: 'Low', icon: Info },
] as const;

const STATUS_OPTIONS: { value: 'all' | AlertStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'acknowledged', label: 'Acknowledged' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

export default function AlertsPage() {
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Build hook filters from current selections
  const hookFilters = {
    ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  };

  const { alerts, loading, error, refetch } = useAlerts(hookFilters);

  // Count alerts per priority (from the full unfiltered-by-priority set when viewing status-only)
  // We fetch a separate unfiltered set for tab badge counts
  const { alerts: allAlerts } = useAlerts(
    statusFilter !== 'all' ? { status: statusFilter } : undefined
  );

  const countByPriority = (priority: string): number => {
    if (priority === 'all') return allAlerts.length;
    return allAlerts.filter((a) => a.priority === priority).length;
  };

  const countByStatus = (status: string): number => {
    const base = priorityFilter !== 'all'
      ? allAlerts.filter((a) => a.priority === priorityFilter)
      : allAlerts;
    if (status === 'all') return base.length;
    return base.filter((a) => a.status === status).length;
  };

  // Realtime: auto-prepend new alerts and show toast
  useRealtimeAlerts(
    useCallback(
      (newAlert: ChurnAlert) => {
        toast.info('New Alert', {
          description: newAlert.title,
          icon: <Bell className="h-4 w-4" />,
        });
        // Refetch to include the new alert in the filtered list
        refetch();
      },
      [refetch]
    )
  );

  // --- Action handlers ---
  const supabase = createClient();

  const handleAcknowledge = useCallback(
    async (id: string) => {
      const { error: updateError } = await supabase
        .from('ch_churn_alerts')
        .update({
          status: 'acknowledged' as AlertStatus,
          acknowledged_by: 'current_user', // Will be replaced by actual auth user
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        toast.error('Failed to acknowledge alert', {
          description: updateError.message,
        });
        return;
      }

      toast.success('Alert acknowledged');
      refetch();
    },
    [supabase, refetch]
  );

  const handleResolve = useCallback(
    async (id: string) => {
      const { error: updateError } = await supabase
        .from('ch_churn_alerts')
        .update({
          status: 'resolved' as AlertStatus,
          resolved_by: 'current_user',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        toast.error('Failed to resolve alert', {
          description: updateError.message,
        });
        return;
      }

      toast.success('Alert resolved');
      refetch();
    },
    [supabase, refetch]
  );

  const handleDismiss = useCallback(
    async (id: string) => {
      const { error: updateError } = await supabase
        .from('ch_churn_alerts')
        .update({
          status: 'dismissed' as AlertStatus,
        })
        .eq('id', id);

      if (updateError) {
        toast.error('Failed to dismiss alert', {
          description: updateError.message,
        });
        return;
      }

      toast.success('Alert dismissed');
      refetch();
    },
    [supabase, refetch]
  );

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Alerts"
        subtitle={`${alerts.length} alert${alerts.length !== 1 ? 's' : ''} total`}
      />

      <div className="flex-1 overflow-auto px-8 py-6 space-y-6">
        {/* Priority tabs */}
        <Tabs
          value={priorityFilter}
          onValueChange={(val) => setPriorityFilter(val)}
        >
          <TabsList>
            {PRIORITY_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = countByPriority(tab.value);
              return (
                <TabsTrigger key={tab.value} value={tab.value}>
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 min-w-[20px] px-1.5 text-xs"
                  >
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Status filter row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500 mr-1">Status:</span>
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={statusFilter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(option.value)}
              className="text-xs h-7"
            >
              {option.label}
              {statusFilter !== option.value && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-4 min-w-[16px] px-1 text-[10px]"
                >
                  {countByStatus(option.value)}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* Alert list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
              <p className="text-sm text-gray-500">Loading alerts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertTriangle className="h-10 w-10 text-red-400" />
              <p className="text-sm font-medium text-gray-700">
                Failed to load alerts
              </p>
              <p className="text-xs text-gray-500 max-w-md">{error.message}</p>
              <Button variant="outline" size="sm" onClick={refetch}>
                Retry
              </Button>
            </div>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center">
              <Bell className="h-10 w-10 text-gray-300" />
              <p className="text-sm font-medium text-gray-700">
                No alerts match your filters
              </p>
              <p className="text-xs text-gray-500">
                {priorityFilter !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting the priority or status filters above.'
                  : 'All clear! No churn risk alerts at this time.'}
              </p>
              {(priorityFilter !== 'all' || statusFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPriorityFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={handleResolve}
                onDismiss={handleDismiss}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
