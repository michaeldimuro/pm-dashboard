'use server';

import { createAdminClient } from '@/lib/supabase/admin';

interface CreateInterventionInput {
  client_id: string;
  alert_id?: string;
  intervention_type: string;
  title: string;
  description?: string;
  conducted_by: string;
  outcome?: string;
  follow_up_date?: string;
}

export async function createIntervention(input: CreateInterventionInput) {
  const supabase = createAdminClient();

  // Get current health score for before measurement
  const { data: latestScore } = await supabase
    .from('ch_client_health_scores')
    .select('overall_score')
    .eq('client_id', input.client_id)
    .order('score_date', { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from('ch_interventions')
    .insert({
      ...input,
      conducted_at: new Date().toISOString(),
      health_score_before: latestScore?.overall_score ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateInterventionOutcome(
  interventionId: string,
  outcome: string,
  outcomeNotes?: string
) {
  const supabase = createAdminClient();

  // Get intervention to find client_id
  const { data: intervention } = await supabase
    .from('ch_interventions')
    .select('client_id')
    .eq('id', interventionId)
    .single();

  // Get current health score for after measurement
  let healthScoreAfter: number | null = null;
  if (intervention) {
    const { data: latestScore } = await supabase
      .from('ch_client_health_scores')
      .select('overall_score')
      .eq('client_id', intervention.client_id)
      .order('score_date', { ascending: false })
      .limit(1)
      .single();
    healthScoreAfter = latestScore?.overall_score ?? null;
  }

  const { data, error } = await supabase
    .from('ch_interventions')
    .update({
      outcome,
      outcome_notes: outcomeNotes,
      health_score_after: healthScoreAfter,
    })
    .eq('id', interventionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function completeFollowUp(
  interventionId: string,
  notes?: string
) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ch_interventions')
    .update({
      follow_up_completed: true,
      follow_up_notes: notes,
    })
    .eq('id', interventionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
