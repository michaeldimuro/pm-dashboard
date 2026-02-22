'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import type { HealthTier } from '@/types';

export async function overrideHealthTier(
  clientId: string,
  tier: HealthTier,
  reason: string,
  overrideBy: string
) {
  const supabase = createAdminClient();

  // Update the most recent health score record
  const { data: latestScore } = await supabase
    .from('ch_client_health_scores')
    .select('id')
    .eq('client_id', clientId)
    .order('score_date', { ascending: false })
    .limit(1)
    .single();

  if (!latestScore) {
    throw new Error('No health score found for this client');
  }

  const { data, error } = await supabase
    .from('ch_client_health_scores')
    .update({
      override_tier: tier,
      override_reason: reason,
      override_by: overrideBy,
      override_at: new Date().toISOString(),
    })
    .eq('id', latestScore.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function clearOverride(clientId: string) {
  const supabase = createAdminClient();

  const { data: latestScore } = await supabase
    .from('ch_client_health_scores')
    .select('id')
    .eq('client_id', clientId)
    .order('score_date', { ascending: false })
    .limit(1)
    .single();

  if (!latestScore) {
    throw new Error('No health score found for this client');
  }

  const { data, error } = await supabase
    .from('ch_client_health_scores')
    .update({
      override_tier: null,
      override_reason: null,
      override_by: null,
      override_at: null,
    })
    .eq('id', latestScore.id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
