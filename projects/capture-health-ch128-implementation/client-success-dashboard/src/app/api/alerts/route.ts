import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);

  const priority = searchParams.get('priority');
  const status = searchParams.get('status');
  const clientId = searchParams.get('clientId');
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  let query = supabase
    .from('ch_churn_alerts')
    .select('*, client:ch_clients(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (priority) query = query.eq('priority', priority);
  if (status) query = query.eq('status', status);
  if (clientId) query = query.eq('client_id', clientId);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();

  const { id, status, acknowledged_by, resolved_by, resolution_notes } = body;

  if (!id || !status) {
    return NextResponse.json(
      { error: 'id and status are required' },
      { status: 400 }
    );
  }

  const updateData: Record<string, unknown> = { status };

  if (status === 'acknowledged') {
    updateData.acknowledged_by = acknowledged_by || 'system';
    updateData.acknowledged_at = new Date().toISOString();
  }

  if (status === 'resolved') {
    updateData.resolved_by = resolved_by || 'system';
    updateData.resolved_at = new Date().toISOString();
    if (resolution_notes) updateData.resolution_notes = resolution_notes;
  }

  const { data, error } = await supabase
    .from('ch_churn_alerts')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
