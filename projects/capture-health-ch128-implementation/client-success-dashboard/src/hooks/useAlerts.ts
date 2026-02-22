'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChurnAlert } from '@/types';

interface AlertFilters {
  priority?: string;
  status?: string;
  clientId?: string;
}

interface UseAlertsReturn {
  alerts: ChurnAlert[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useAlerts(filters?: AlertFilters): UseAlertsReturn {
  const [alerts, setAlerts] = useState<ChurnAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Serialize filters to a stable string for the dependency array
  const filterKey = JSON.stringify(filters ?? {});

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query with joined client data
      let query = supabase
        .from('ch_churn_alerts')
        .select('*, client:ch_clients(*)');

      // Apply optional filters
      if (filters?.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error: queryError } = await query;

      if (queryError) {
        throw new Error(`Failed to fetch alerts: ${queryError.message}`);
      }

      // Map the joined data to match ChurnAlert shape
      const mapped: ChurnAlert[] = (data ?? []).map((row: Record<string, unknown>) => {
        const { client, ...alertFields } = row;
        return {
          ...alertFields,
          client: client ?? undefined,
        } as ChurnAlert;
      });

      setAlerts(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refetch: fetchAlerts };
}
