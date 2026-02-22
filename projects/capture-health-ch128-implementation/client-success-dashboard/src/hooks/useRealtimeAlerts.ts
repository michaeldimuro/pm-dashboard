'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ChurnAlert } from '@/types';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtimeAlerts(onNewAlert: (alert: ChurnAlert) => void): void {
  // Use a ref to always have the latest callback without re-subscribing
  const callbackRef = useRef(onNewAlert);
  callbackRef.current = onNewAlert;

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    channel = supabase
      .channel('ch_churn_alerts_realtime')
      .on<ChurnAlert>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ch_churn_alerts',
        },
        (payload) => {
          if (payload.new) {
            callbackRef.current(payload.new as ChurnAlert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
