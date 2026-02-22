'use client';

import { useState, useMemo } from 'react';
import { useClients } from '@/hooks/useClients';
import Header from '@/components/dashboard/Header';
import { HealthScoreBadge } from '@/components/health/HealthScoreBadge';
import { SparklineChart } from '@/components/health/SparklineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Bell,
  ArrowUpDown,
} from 'lucide-react';
import type { ClientWithHealth } from '@/types';

type SortField = 'company_name' | 'overall_score' | 'mrr_cents' | 'days_since_last_login';
type SortDirection = 'asc' | 'desc';

const tierColorMap: Record<string, string> = {
  green: 'text-emerald-600',
  yellow: 'text-amber-600',
  red: 'text-red-600',
};

function formatMrr(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function capitalizePlan(plan: string): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

export default function DashboardPage() {
  const { clients, loading, error } = useClients();
  const [sortField, setSortField] = useState<SortField>('company_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // --- Summary calculations ---
  const summary = useMemo(() => {
    const total = clients.length;
    let green = 0;
    let yellow = 0;
    let red = 0;
    let openAlerts = 0;

    for (const client of clients) {
      const tier = client.latest_score?.tier;
      if (tier === 'green') green++;
      else if (tier === 'yellow') yellow++;
      else if (tier === 'red') red++;

      openAlerts += client.open_alerts_count ?? 0;
    }

    return { total, green, yellow, red, openAlerts };
  }, [clients]);

  // --- Sorting ---
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedClients = useMemo(() => {
    const sorted = [...clients];
    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'company_name':
          comparison = a.company_name.localeCompare(b.company_name);
          break;
        case 'overall_score':
          comparison =
            (a.latest_score?.overall_score ?? 0) -
            (b.latest_score?.overall_score ?? 0);
          break;
        case 'mrr_cents':
          comparison = a.mrr_cents - b.mrr_cents;
          break;
        case 'days_since_last_login':
          comparison = a.days_since_last_login - b.days_since_last_login;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [clients, sortField, sortDirection]);

  // --- Render sort button ---
  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      className="flex items-center gap-1 font-medium hover:text-gray-900 transition-colors"
      onClick={() => handleSort(field)}
    >
      {label}
      <ArrowUpDown
        className={`h-3.5 w-3.5 ${
          sortField === field ? 'text-gray-900' : 'text-gray-400'
        }`}
      />
    </button>
  );

  // --- Loading / Error states ---
  if (loading) {
    return (
      <>
        <Header title="Client Dashboard" subtitle="Overview of all client health scores" />
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500 text-sm">Loading clients...</div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Client Dashboard" subtitle="Overview of all client health scores" />
        <div className="flex items-center justify-center h-96">
          <div className="text-red-500 text-sm">
            Error loading clients: {error.message}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Client Dashboard" subtitle="Overview of all client health scores" />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 p-8 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Clients
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
          </CardContent>
        </Card>

        {/* Green (Healthy) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Healthy
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary.green}
            </div>
          </CardContent>
        </Card>

        {/* Yellow (At Risk) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              At Risk
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {summary.yellow}
            </div>
          </CardContent>
        </Card>

        {/* Red (Critical) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Critical
            </CardTitle>
            <AlertOctagon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary.red}
            </div>
          </CardContent>
        </Card>

        {/* Open Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Open Alerts
            </CardTitle>
            <Bell className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.openAlerts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Client Table */}
      <div className="px-8 pb-8">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">
                    <SortButton field="company_name" label="Company Name" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="overall_score" label="Health Score" />
                  </TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>
                    <SortButton field="mrr_cents" label="MRR" />
                  </TableHead>
                  <TableHead>
                    <SortButton field="days_since_last_login" label="Last Login" />
                  </TableHead>
                  <TableHead>Open Alerts</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                      No clients found. Add clients to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedClients.map((client: ClientWithHealth) => (
                    <TableRow key={client.id}>
                      {/* Company Name */}
                      <TableCell className="pl-6 font-medium">
                        <Link
                          href={`/dashboard/${client.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {client.company_name}
                        </Link>
                      </TableCell>

                      {/* Health Score */}
                      <TableCell>
                        {client.latest_score ? (
                          <HealthScoreBadge
                            score={client.latest_score.overall_score}
                            tier={client.latest_score.tier}
                            size="sm"
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">--</span>
                        )}
                      </TableCell>

                      {/* Tier */}
                      <TableCell>
                        {client.latest_score ? (
                          <span
                            className={`font-medium capitalize ${
                              tierColorMap[client.latest_score.tier] ?? 'text-gray-500'
                            }`}
                          >
                            {client.latest_score.tier}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">--</span>
                        )}
                      </TableCell>

                      {/* Plan */}
                      <TableCell className="text-gray-700">
                        {capitalizePlan(client.plan_tier)}
                      </TableCell>

                      {/* MRR */}
                      <TableCell className="font-medium text-gray-900">
                        {formatMrr(client.mrr_cents)}
                      </TableCell>

                      {/* Last Login */}
                      <TableCell className="text-gray-600">
                        {client.days_since_last_login === 0
                          ? 'Today'
                          : client.days_since_last_login === 1
                            ? '1 day ago'
                            : `${client.days_since_last_login} days ago`}
                      </TableCell>

                      {/* Open Alerts */}
                      <TableCell>
                        {(client.open_alerts_count ?? 0) > 0 ? (
                          <Badge
                            variant="destructive"
                            className="text-xs"
                          >
                            {client.open_alerts_count}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">0</span>
                        )}
                      </TableCell>

                      {/* Trend Sparkline */}
                      <TableCell>
                        {client.latest_score ? (
                          <SparklineChart
                            data={[client.latest_score.overall_score]}
                            color={
                              client.latest_score.tier === 'green'
                                ? '#10b981'
                                : client.latest_score.tier === 'yellow'
                                  ? '#f59e0b'
                                  : '#ef4444'
                            }
                          />
                        ) : (
                          <span className="text-gray-400 text-sm">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
