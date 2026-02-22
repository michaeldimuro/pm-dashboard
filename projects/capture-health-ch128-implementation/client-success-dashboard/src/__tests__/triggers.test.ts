import { describe, it, expect } from 'vitest';
import { detectTriggers, deduplicateTriggers } from '@/lib/health-score/triggers';
import type { Client, ChurnAlert } from '@/types';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'test-client-1',
    company_name: 'Test Corp',
    plan_tier: 'professional',
    contract_start_date: '2025-01-01',
    contract_end_date: '2026-01-01',
    mrr_cents: 100000,
    status: 'active',
    primary_contact_name: 'John',
    primary_contact_email: 'john@test.com',
    primary_contact_phone: null,
    exec_sponsor_name: null,
    exec_sponsor_email: null,
    exec_sponsor_status: 'active',
    nps_latest: 9,
    csat_latest: 4.5,
    last_qbr_date: '2025-12-01',
    next_qbr_date: '2026-03-01',
    qbrs_attended_last_2: 2,
    login_count_30d: 20,
    days_since_last_login: 2,
    features_used_count: 6,
    feature_usage_mom_trend: 'increasing',
    patient_records_trend: 'growth',
    active_users_count: 5,
    total_users_count: 10,
    support_tickets_30d: 1,
    support_tickets_7d: 0,
    escalations_30d: 0,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('detectTriggers', () => {
  it('returns no triggers for healthy client', () => {
    const triggers = detectTriggers(makeClient());
    expect(triggers).toHaveLength(0);
  });

  // Critical triggers
  it('detects login drought (14+ days)', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 14 }));
    const loginDrought = triggers.find(t => t.trigger_type === 'login_drought');
    expect(loginDrought).toBeDefined();
    expect(loginDrought!.priority).toBe('critical');
    expect(loginDrought!.metric_value).toBe(14);
  });

  it('does not trigger login drought at 13 days', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 13 }));
    expect(triggers.find(t => t.trigger_type === 'login_drought')).toBeUndefined();
  });

  it('detects NPS detractor (0-6)', () => {
    const triggers = detectTriggers(makeClient({ nps_latest: 6 }));
    const npsDetractor = triggers.find(t => t.trigger_type === 'nps_detractor');
    expect(npsDetractor).toBeDefined();
    expect(npsDetractor!.priority).toBe('critical');
  });

  it('does not trigger NPS detractor at 7', () => {
    const triggers = detectTriggers(makeClient({ nps_latest: 7 }));
    expect(triggers.find(t => t.trigger_type === 'nps_detractor')).toBeUndefined();
  });

  it('detects support spike (3+ tickets in 7d)', () => {
    const triggers = detectTriggers(makeClient({ support_tickets_7d: 3 }));
    const spike = triggers.find(t => t.trigger_type === 'support_spike');
    expect(spike).toBeDefined();
    expect(spike!.priority).toBe('critical');
  });

  it('detects feature crash (decreasing + low count)', () => {
    const triggers = detectTriggers(makeClient({
      feature_usage_mom_trend: 'decreasing',
      features_used_count: 1,
    }));
    const crash = triggers.find(t => t.trigger_type === 'feature_crash');
    expect(crash).toBeDefined();
    expect(crash!.priority).toBe('critical');
  });

  // Medium triggers
  it('detects declining usage (decreasing trend, >2 features)', () => {
    const triggers = detectTriggers(makeClient({
      feature_usage_mom_trend: 'decreasing',
      features_used_count: 4,
    }));
    const declining = triggers.find(t => t.trigger_type === 'declining_usage');
    expect(declining).toBeDefined();
    expect(declining!.priority).toBe('medium');
  });

  it('detects missed QBR (0 attended)', () => {
    const triggers = detectTriggers(makeClient({ qbrs_attended_last_2: 0 }));
    const missed = triggers.find(t => t.trigger_type === 'missed_qbr');
    expect(missed).toBeDefined();
    expect(missed!.priority).toBe('medium');
  });

  it('detects CSAT drop (<=3)', () => {
    const triggers = detectTriggers(makeClient({ csat_latest: 3 }));
    const csat = triggers.find(t => t.trigger_type === 'csat_drop');
    expect(csat).toBeDefined();
    expect(csat!.priority).toBe('medium');
  });

  it('detects NPS passive (7-8)', () => {
    const triggers = detectTriggers(makeClient({ nps_latest: 7 }));
    const nps = triggers.find(t => t.trigger_type === 'nps_passive');
    expect(nps).toBeDefined();
    expect(nps!.priority).toBe('medium');
  });

  // Low triggers
  it('detects stagnant usage (flat + low features)', () => {
    const triggers = detectTriggers(makeClient({
      feature_usage_mom_trend: 'flat',
      features_used_count: 2,
    }));
    const stagnant = triggers.find(t => t.trigger_type === 'stagnant_usage');
    expect(stagnant).toBeDefined();
    expect(stagnant!.priority).toBe('low');
  });

  it('detects single user reliance', () => {
    const triggers = detectTriggers(makeClient({
      active_users_count: 1,
      total_users_count: 5,
    }));
    const single = triggers.find(t => t.trigger_type === 'single_user_reliance');
    expect(single).toBeDefined();
    expect(single!.priority).toBe('low');
  });

  it('does not trigger single user reliance when only 1 total user', () => {
    const triggers = detectTriggers(makeClient({
      active_users_count: 1,
      total_users_count: 1,
    }));
    expect(triggers.find(t => t.trigger_type === 'single_user_reliance')).toBeUndefined();
  });

  it('handles null NPS (no trigger)', () => {
    const triggers = detectTriggers(makeClient({ nps_latest: null }));
    expect(triggers.find(t => t.trigger_type === 'nps_detractor')).toBeUndefined();
    expect(triggers.find(t => t.trigger_type === 'nps_passive')).toBeUndefined();
  });

  it('handles null CSAT (no trigger)', () => {
    const triggers = detectTriggers(makeClient({ csat_latest: null }));
    expect(triggers.find(t => t.trigger_type === 'csat_drop')).toBeUndefined();
  });

  it('can detect multiple triggers simultaneously', () => {
    const triggers = detectTriggers(makeClient({
      days_since_last_login: 20,
      nps_latest: 5,
      support_tickets_7d: 4,
      qbrs_attended_last_2: 0,
    }));
    expect(triggers.length).toBeGreaterThanOrEqual(4);
    const types = triggers.map(t => t.trigger_type);
    expect(types).toContain('login_drought');
    expect(types).toContain('nps_detractor');
    expect(types).toContain('support_spike');
    expect(types).toContain('missed_qbr');
  });
});

describe('deduplicateTriggers', () => {
  it('returns all triggers when no existing alerts', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 20 }));
    const deduped = deduplicateTriggers(triggers, []);
    expect(deduped).toEqual(triggers);
  });

  it('filters out triggers with recent open alerts', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 20 }));
    const existingAlerts: ChurnAlert[] = [
      {
        id: 'alert-1',
        client_id: 'test-client-1',
        priority: 'critical',
        status: 'open',
        trigger_type: 'login_drought',
        title: 'Login drought',
        description: null,
        metric_name: null,
        metric_value: null,
        threshold_value: null,
        slack_sent: false,
        slack_sent_at: null,
        email_sent: false,
        email_sent_at: null,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const deduped = deduplicateTriggers(triggers, existingAlerts);
    expect(deduped.find(t => t.trigger_type === 'login_drought')).toBeUndefined();
  });

  it('allows triggers when existing alert is resolved', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 20 }));
    const existingAlerts: ChurnAlert[] = [
      {
        id: 'alert-1',
        client_id: 'test-client-1',
        priority: 'critical',
        status: 'resolved',
        trigger_type: 'login_drought',
        title: 'Login drought',
        description: null,
        metric_name: null,
        metric_value: null,
        threshold_value: null,
        slack_sent: false,
        slack_sent_at: null,
        email_sent: false,
        email_sent_at: null,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    const deduped = deduplicateTriggers(triggers, existingAlerts);
    expect(deduped.find(t => t.trigger_type === 'login_drought')).toBeDefined();
  });

  it('allows triggers when existing alert is older than 7 days', () => {
    const triggers = detectTriggers(makeClient({ days_since_last_login: 20 }));
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const existingAlerts: ChurnAlert[] = [
      {
        id: 'alert-1',
        client_id: 'test-client-1',
        priority: 'critical',
        status: 'open',
        trigger_type: 'login_drought',
        title: 'Login drought',
        description: null,
        metric_name: null,
        metric_value: null,
        threshold_value: null,
        slack_sent: false,
        slack_sent_at: null,
        email_sent: false,
        email_sent_at: null,
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: eightDaysAgo,
        updated_at: eightDaysAgo,
      },
    ];

    const deduped = deduplicateTriggers(triggers, existingAlerts);
    expect(deduped.find(t => t.trigger_type === 'login_drought')).toBeDefined();
  });
});
