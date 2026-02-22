'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClientHealthScore } from '@/types';

interface UseClientHealthReturn {
  scores: ClientHealthScore[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useClientHealth(clientId: string, days: number = 30): UseClientHealthReturn {
  const [scores, setScores] = useState<ClientHealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchScores = useCallback(async () => {
    if (!clientId) {
      setScores([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Calculate the cutoff date (N days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const cutoffISO = cutoffDate.toISOString().split('T')[0]; // YYYY-MM-DD

      const { data, error: queryError } = await supabase
        .from('ch_client_health_scores')
        .select('*')
        .eq('client_id', clientId)
        .gte('score_date', cutoffISO)
        .order('score_date', { ascending: true });

      if (queryError) {
        throw new Error(`Failed to fetch health scores: ${queryError.message}`);
      }

      setScores((data as ClientHealthScore[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [clientId, days]);

  useEffect(() => {
    fetchScores();
  }, [fetchScores]);

  return { scores, loading, error, refetch: fetchScores };
}
