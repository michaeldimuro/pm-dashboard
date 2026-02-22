'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useClientHealth } from '@/hooks/useClientHealth';
import { useAlerts } from '@/hooks/useAlerts';
import Header from '@/components/dashboard/Header';
import { HealthScoreGauge } from '@/components/health/HealthScoreGauge';
import { SubScoreBreakdown } from '@/components/health/SubScoreBreakdown';
import { UsageTrendChart } from '@/components/health/UsageTrendChart';
import { AlertCard } from '@/components/health/AlertCard';
import { InterventionForm } from '@/components/health/InterventionForm';
import { InterventionHistory } from '@/components/health/InterventionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Plus,
  Shield,
  Calendar,
  Building2,
  User,
  Mail,
  Loader2,
} from 'lucide-react';
import type {
  Client,
  ClientHealthScore,
  Intervention,
  HealthTier,
  InterventionType,
  InterventionOutcome,
} from '@/types';

// ---------- helpers ----------

const planBadgeStyles: Record<string, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
};

const tierBadgeStyles: Record<HealthTier, string> = {
  green: 'bg-emerald-100 text-emerald-800',
  yellow: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

type DayRange = 7 | 30 | 60 | 90;
const dayRangeOptions: DayRange[] = [7, 30, 60, 90];

// ---------- page component ----------

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;
  const supabase = createClient();

  // --- local state ---
  const [client, setClient] = useState<Client | null>(null);
  const [latestScore, setLatestScore] = useState<ClientHealthScore | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);
  const [loadingInterventions, setLoadingInterventions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interventionDialogOpen, setInterventionDialogOpen] = useState(false);
  const [trendDays, setTrendDays] = useState<DayRange>(30);

  // --- hooks ---
  const {
    scores: healthScores,
    loading: loadingHealth,
    refetch: refetchHealth,
  } = useClientHealth(clientId, trendDays);

  const {
    alerts,
    loading: loadingAlerts,
    refetch: refetchAlerts,
  } = useAlerts({ clientId });

  // --- data fetching ---

  const fetchClient = useCallback(async () => {
    if (!clientId) return;
    setLoadingClient(true);
    try {
      const { data, error: queryError } = await supabase
        .from('ch_clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (queryError) throw new Error(queryError.message);
      setClient(data as Client);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingClient(false);
    }
  }, [clientId]);

  const fetchLatestScore = useCallback(async () => {
    if (!clientId) return;
    try {
      const { data, error: queryError } = await supabase
        .from('ch_client_health_scores')
        .select('*')
        .eq('client_id', clientId)
        .order('score_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError) throw new Error(queryError.message);
      setLatestScore((data as ClientHealthScore) ?? null);
    } catch (err) {
      console.error('Failed to fetch latest score:', err);
    }
  }, [clientId]);

  const fetchInterventions = useCallback(async () => {
    if (!clientId) return;
    setLoadingInterventions(true);
    try {
      const { data, error: queryError } = await supabase
        .from('ch_interventions')
        .select('*')
        .eq('client_id', clientId)
        .order('conducted_at', { ascending: false });

      if (queryError) throw new Error(queryError.message);
      setInterventions((data as Intervention[]) ?? []);
    } catch (err) {
      console.error('Failed to fetch interventions:', err);
    } finally {
      setLoadingInterventions(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
    fetchLatestScore();
    fetchInterventions();
  }, [fetchClient, fetchLatestScore, fetchInterventions]);

  // --- alert actions ---

  async function handleAcknowledgeAlert(alertId: string) {
    const { error: updateError } = await supabase
      .from('ch_churn_alerts')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: 'csm', // placeholder; in production this would be the auth user
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('Failed to acknowledge alert:', updateError);
      return;
    }
    refetchAlerts();
  }

  async function handleResolveAlert(alertId: string) {
    const notes = window.prompt('Resolution notes (optional):');
    const { error: updateError } = await supabase
      .from('ch_churn_alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: 'csm',
        resolution_notes: notes || null,
      })
      .eq('id', alertId);

    if (updateError) {
      console.error('Failed to resolve alert:', updateError);
      return;
    }
    refetchAlerts();
  }

  async function handleDismissAlert(alertId: string) {
    const { error: updateError } = await supabase
      .from('ch_churn_alerts')
      .update({ status: 'dismissed' })
      .eq('id', alertId);

    if (updateError) {
      console.error('Failed to dismiss alert:', updateError);
      return;
    }
    refetchAlerts();
  }

  // --- intervention submit ---

  async function handleInterventionSubmit(formData: {
    intervention_type: InterventionType;
    title: string;
    description: string;
    conducted_by: string;
    outcome: InterventionOutcome;
    follow_up_date: string;
  }) {
    const { error: insertError } = await supabase
      .from('ch_interventions')
      .insert({
        client_id: clientId,
        intervention_type: formData.intervention_type,
        title: formData.title,
        description: formData.description || null,
        conducted_by: formData.conducted_by,
        conducted_at: new Date().toISOString(),
        outcome: formData.outcome,
        follow_up_date: formData.follow_up_date || null,
        follow_up_completed: false,
        health_score_before: latestScore?.overall_score ?? null,
      });

    if (insertError) {
      console.error('Failed to log intervention:', insertError);
      return;
    }
    fetchInterventions();
  }

  // --- override tier ---

  async function handleOverrideTier() {
    const tier = window.prompt(
      'Enter override tier (green, yellow, or red):',
    ) as HealthTier | null;

    if (!tier || !['green', 'yellow', 'red'].includes(tier)) {
      if (tier !== null) {
        alert('Invalid tier. Please enter "green", "yellow", or "red".');
      }
      return;
    }

    const reason = window.prompt('Reason for override:');
    if (reason === null) return; // user cancelled

    if (!latestScore) {
      alert('No health score record exists for this client yet.');
      return;
    }

    const { error: updateError } = await supabase
      .from('ch_client_health_scores')
      .update({
        override_tier: tier,
        override_reason: reason || null,
        override_by: 'csm',
        override_at: new Date().toISOString(),
      })
      .eq('id', latestScore.id);

    if (updateError) {
      console.error('Failed to override tier:', updateError);
      return;
    }
    fetchLatestScore();
    refetchHealth();
  }

  // --- schedule QBR (placeholder) ---

  function handleScheduleQBR() {
    // In a full implementation this would open a calendar dialog or integrate with
    // a scheduling API. For now, prompt for a date and update the client record.
    const dateStr = window.prompt('Enter QBR date (YYYY-MM-DD):');
    if (!dateStr) return;

    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) {
      alert('Invalid date format. Please use YYYY-MM-DD.');
      return;
    }

    supabase
      .from('ch_clients')
      .update({ next_qbr_date: dateStr })
      .eq('id', clientId)
      .then(({ error: updateError }) => {
        if (updateError) {
          console.error('Failed to schedule QBR:', updateError);
          return;
        }
        fetchClient();
      });
  }

  // --- derived values ---

  const effectiveTier: HealthTier =
    latestScore?.override_tier ?? latestScore?.tier ?? 'green';

  const overallScore = latestScore?.overall_score ?? 0;

  const trendData = healthScores.map((s) => ({
    date: s.score_date,
    score: s.overall_score,
    tier: s.override_tier ?? s.tier,
  }));

  const activeAlerts = alerts.filter(
    (a) => a.status === 'open' || a.status === 'acknowledged',
  );

  // --- loading / error states ---

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-red-600 text-sm">{error ?? 'Client not found.'}</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  // --- render ---

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <Header title={client.company_name} subtitle={`Client detail &middot; ${client.status}`}>
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <Button
          variant="default"
          size="sm"
          onClick={() => setInterventionDialogOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> Log Intervention
        </Button>
        <Button variant="outline" size="sm" onClick={handleOverrideTier}>
          <Shield className="h-4 w-4 mr-1" /> Override Tier
        </Button>
        <Button variant="outline" size="sm" onClick={handleScheduleQBR}>
          <Calendar className="h-4 w-4 mr-1" /> Schedule QBR
        </Button>
      </Header>

      <div className="flex-1 p-8 space-y-8">
        {/* Client Info Bar */}
        <div className="flex flex-wrap items-center gap-4">
          <Badge
            variant="secondary"
            className={planBadgeStyles[client.plan_tier] ?? 'bg-gray-100 text-gray-700'}
          >
            {client.plan_tier.charAt(0).toUpperCase() + client.plan_tier.slice(1)}
          </Badge>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <Building2 className="h-4 w-4 text-gray-400" />
            <span className="font-semibold">{formatCurrency(client.mrr_cents)}</span>
            <span className="text-gray-400">MRR</span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="text-sm text-gray-500">
            Contract: {formatDate(client.contract_start_date)}
            {' - '}
            {client.contract_end_date ? formatDate(client.contract_end_date) : 'Ongoing'}
          </div>
          {client.primary_contact_name && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <User className="h-3.5 w-3.5 text-gray-400" />
                <span>{client.primary_contact_name}</span>
              </div>
            </>
          )}
          {client.primary_contact_email && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              <a
                href={`mailto:${client.primary_contact_email}`}
                className="hover:text-gray-900 underline-offset-2 hover:underline"
              >
                {client.primary_contact_email}
              </a>
            </div>
          )}
          {client.exec_sponsor_name && (
            <>
              <Separator orientation="vertical" className="h-5" />
              <div className="text-sm text-gray-500">
                Exec Sponsor: <span className="font-medium text-gray-700">{client.exec_sponsor_name}</span>
                {' '}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-0.5">
                  {client.exec_sponsor_status}
                </Badge>
              </div>
            </>
          )}
        </div>

        {/* Health Score + Sub-Score Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Score Gauge */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Health Score
                {latestScore?.override_tier && (
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${tierBadgeStyles[latestScore.override_tier]}`}
                  >
                    Overridden
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {latestScore ? (
                <>
                  <HealthScoreGauge
                    score={overallScore}
                    tier={effectiveTier}
                    size={200}
                  />
                  <Badge
                    variant="secondary"
                    className={`${tierBadgeStyles[effectiveTier]} text-xs`}
                  >
                    {effectiveTier.charAt(0).toUpperCase() + effectiveTier.slice(1)} Tier
                  </Badge>
                  {latestScore.override_tier && latestScore.override_reason && (
                    <p className="text-xs text-gray-500 text-center mt-1 px-4">
                      Override reason: {latestScore.override_reason}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 py-12">No score data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Sub-Score Breakdown */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">
                Score Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {latestScore ? (
                <SubScoreBreakdown
                  productUsage={latestScore.product_usage_score}
                  engagement={latestScore.engagement_score}
                  relationship={latestScore.relationship_score}
                  support={latestScore.support_score}
                />
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">
                  No score data yet
                </p>
              )}

              {/* Supplementary metrics from client record */}
              {latestScore && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400">Logins (30d)</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {client.login_count_30d}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Active Users</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {client.active_users_count}/{client.total_users_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">NPS</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {client.nps_latest ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Support Tickets (30d)</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {client.support_tickets_30d}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Trend Chart */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Health Score Trend
              </CardTitle>
              <div className="flex items-center gap-1">
                {dayRangeOptions.map((d) => (
                  <Button
                    key={d}
                    variant={trendDays === d ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs h-7 px-2.5"
                    onClick={() => setTrendDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingHealth ? (
              <div className="flex items-center justify-center h-[300px]">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : trendData.length > 0 ? (
              <UsageTrendChart data={trendData} height={300} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                No trend data available for the selected period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Active Alerts
                {activeAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2 text-[10px]">
                    {activeAlerts.length}
                  </Badge>
                )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : activeAlerts.length > 0 ? (
              <div className="space-y-4">
                {activeAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={handleAcknowledgeAlert}
                    onResolve={handleResolveAlert}
                    onDismiss={handleDismissAlert}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-8">
                No active alerts for this client.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Intervention History */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">
                Intervention History
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setInterventionDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Log New
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInterventions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : (
              <InterventionHistory interventions={interventions} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intervention Form Dialog */}
      <InterventionForm
        clientId={clientId}
        open={interventionDialogOpen}
        onOpenChange={setInterventionDialogOpen}
        onSubmit={handleInterventionSubmit}
      />
    </div>
  );
}
