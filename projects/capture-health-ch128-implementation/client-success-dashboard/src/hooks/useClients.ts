'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClientWithHealth, Client, ClientHealthScore, ChurnAlert } from '@/types';

interface UseClientsReturn {
  clients: ClientWithHealth[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<ClientWithHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch all clients ordered by company name
      const { data: clientRows, error: clientsError } = await supabase
        .from('ch_clients')
        .select('*')
        .order('company_name', { ascending: true });

      if (clientsError) {
        throw new Error(`Failed to fetch clients: ${clientsError.message}`);
      }

      if (!clientRows || clientRows.length === 0) {
        setClients([]);
        return;
      }

      const clientIds = clientRows.map((c: Client) => c.id);

      // 2. Fetch latest health score per client
      // Query all scores for these clients, ordered by score_date desc.
      // We'll group them client-side to pick the most recent per client.
      const { data: scoreRows, error: scoresError } = await supabase
        .from('ch_client_health_scores')
        .select('*')
        .in('client_id', clientIds)
        .order('score_date', { ascending: false });

      if (scoresError) {
        throw new Error(`Failed to fetch health scores: ${scoresError.message}`);
      }

      // Build a map of client_id -> latest score (first occurrence per client since sorted desc)
      const latestScoreMap = new Map<string, ClientHealthScore>();
      if (scoreRows) {
        for (const score of scoreRows as ClientHealthScore[]) {
          if (!latestScoreMap.has(score.client_id)) {
            latestScoreMap.set(score.client_id, score);
          }
        }
      }

      // 3. Fetch open alert counts per client
      const { data: alertRows, error: alertsError } = await supabase
        .from('ch_churn_alerts')
        .select('client_id')
        .in('client_id', clientIds)
        .in('status', ['open', 'acknowledged']);

      if (alertsError) {
        throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
      }

      // Count alerts per client_id
      const alertCountMap = new Map<string, number>();
      if (alertRows) {
        for (const row of alertRows as Pick<ChurnAlert, 'client_id'>[]) {
          alertCountMap.set(row.client_id, (alertCountMap.get(row.client_id) || 0) + 1);
        }
      }

      // 4. Merge into ClientWithHealth[]
      const merged: ClientWithHealth[] = clientRows.map((client: Client) => ({
        ...client,
        latest_score: latestScoreMap.get(client.id),
        open_alerts_count: alertCountMap.get(client.id) ?? 0,
      }));

      setClients(merged);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
}
