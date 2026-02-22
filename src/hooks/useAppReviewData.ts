/**
 * App Review Data Hook
 * Fetches initial data and subscribes to realtime changes
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppReviewStore } from '@/stores/appReviewStore';
import type { AppReviewSubmission, AppReviewStatusChange } from '@/types/appReview';

const API_KEY = 'ops-api-key-2026';

export function useAppReviewData() {
  const [initialized, setInitialized] = useState(false);
  const store = useAppReviewStore();

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        // Fetch via status API
        const response = await fetch('/api/app-review/status', {
          headers: { Authorization: `Bearer ${API_KEY}` },
        });

        if (!response.ok) throw new Error(`Status API error: ${response.status}`);

        const json = await response.json();
        if (!json.success) throw new Error(json.error || 'Failed to fetch');

        if (mounted) {
          store.setCurrentSubmission(json.data.currentSubmission);
          store.setSubmissions(json.data.submissions);
          store.setStatusChanges(json.data.statusChanges);
          store.setTemplates(json.data.templates);
          store.setLoading(false);
          store.setError(null);
          setInitialized(true);
        }
      } catch (err) {
        console.error('[useAppReviewData] Fetch error:', err);
        if (mounted) {
          store.setError(String(err));
          store.setLoading(false);
        }
      }
    };

    fetchData();

    // Realtime subscriptions
    const channel = supabase
      .channel('app-review-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_review_submissions' },
        (payload) => {
          if (!mounted) return;
          const row = payload.new as AppReviewSubmission;
          if (payload.eventType === 'INSERT') {
            store.setSubmissions([row, ...store.submissions]);
            store.setCurrentSubmission(row);
          } else if (payload.eventType === 'UPDATE') {
            store.updateSubmission(row);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_review_status_changes' },
        (payload) => {
          if (!mounted) return;
          store.addStatusChange(payload.new as AppReviewStatusChange);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { initialized, loading: store.loading, error: store.error };
}

/**
 * Trigger a manual poll check
 */
export async function triggerCheckNow(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/app-review/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ action: 'check_now' }),
    });
    return response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Send a test Telegram notification
 */
export async function triggerTestNotification(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/app-review/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ action: 'test_notification' }),
    });
    return response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Mark a rejection as responded to
 */
export async function markResponded(submissionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/app-review/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ action: 'mark_responded', submission_id: submissionId }),
    });
    return response.json();
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
