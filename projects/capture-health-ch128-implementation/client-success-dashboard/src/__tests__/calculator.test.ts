import { describe, it, expect } from 'vitest';
import { calculateHealthScore, tierFromScore } from '@/lib/health-score/calculator';
import type { ClientMetrics } from '@/types';

function makeMetrics(overrides: Partial<ClientMetrics> = {}): ClientMetrics {
  return {
    login_count_30d: 20,
    features_used_count: 6,
    patient_records_trend: 'growth',
    days_since_last_login: 1,
    feature_usage_mom_trend: 'increasing',
    exec_sponsor_status: 'active',
    qbrs_attended_last_2: 2,
    nps_latest: 9,
    support_tickets_30d: 0,
    support_tickets_7d: 0,
    escalations_30d: 0,
    csat_latest: 5,
    active_users_count: 5,
    total_users_count: 10,
    ...overrides,
  };
}

describe('tierFromScore', () => {
  it('returns green for scores 80-100', () => {
    expect(tierFromScore(80)).toBe('green');
    expect(tierFromScore(100)).toBe('green');
    expect(tierFromScore(90)).toBe('green');
  });

  it('returns yellow for scores 50-79', () => {
    expect(tierFromScore(50)).toBe('yellow');
    expect(tierFromScore(79)).toBe('yellow');
    expect(tierFromScore(65)).toBe('yellow');
  });

  it('returns red for scores 0-49', () => {
    expect(tierFromScore(0)).toBe('red');
    expect(tierFromScore(49)).toBe('red');
    expect(tierFromScore(25)).toBe('red');
  });
});

describe('calculateHealthScore', () => {
  it('returns perfect score for ideal metrics', () => {
    const result = calculateHealthScore(makeMetrics());
    expect(result.overall_score).toBe(100);
    expect(result.tier).toBe('green');
    expect(result.product_usage.score).toBe(100);
    expect(result.engagement.score).toBe(100);
    expect(result.relationship.score).toBe(100);
    expect(result.support.score).toBe(100);
  });

  it('returns red tier for worst metrics', () => {
    const result = calculateHealthScore(makeMetrics({
      login_count_30d: 0,
      features_used_count: 0,
      patient_records_trend: 'declining',
      days_since_last_login: 30,
      feature_usage_mom_trend: 'decreasing',
      exec_sponsor_status: 'none',
      qbrs_attended_last_2: 0,
      nps_latest: 3,
      support_tickets_30d: 10,
      escalations_30d: 5,
      csat_latest: 1,
    }));
    expect(result.overall_score).toBe(0);
    expect(result.tier).toBe('red');
  });

  it('weights product usage at 40%', () => {
    // Perfect everything except zero product usage
    const result = calculateHealthScore(makeMetrics({
      login_count_30d: 0,
      features_used_count: 0,
      patient_records_trend: 'declining',
    }));
    // Product usage = 0, others = 100
    // Overall = 0*0.4 + 100*0.3 + 100*0.2 + 100*0.1 = 60
    expect(result.overall_score).toBe(60);
    expect(result.tier).toBe('yellow');
  });

  it('weights engagement at 30%', () => {
    const result = calculateHealthScore(makeMetrics({
      days_since_last_login: 30,
      feature_usage_mom_trend: 'decreasing',
    }));
    // Product usage = 100, Engagement = 0, Relationship = 100, Support = 100
    // Overall = 100*0.4 + 0*0.3 + 100*0.2 + 100*0.1 = 70
    expect(result.overall_score).toBe(70);
    expect(result.tier).toBe('yellow');
  });

  it('handles null NPS gracefully (neutral = 50)', () => {
    const result = calculateHealthScore(makeMetrics({ nps_latest: null }));
    // Relationship: exec_sponsor(100)*0.5 + qbr(100)*0.3 + nps(50)*0.2 = 90
    expect(result.relationship.score).toBe(90);
  });

  it('handles null CSAT gracefully (neutral = 50)', () => {
    const result = calculateHealthScore(makeMetrics({ csat_latest: null }));
    // Support: tickets(100)*0.4 + escalations(100)*0.4 + csat(50)*0.2 = 90
    expect(result.support.score).toBe(90);
  });

  it('correctly scores boundary values for login frequency', () => {
    // Exactly at green threshold
    const green = calculateHealthScore(makeMetrics({ login_count_30d: 15 }));
    expect(green.product_usage.details.login_frequency).toBe(100);

    // Just below green
    const yellow = calculateHealthScore(makeMetrics({ login_count_30d: 14 }));
    expect(yellow.product_usage.details.login_frequency).toBe(50);

    // At yellow threshold
    const yellowLow = calculateHealthScore(makeMetrics({ login_count_30d: 5 }));
    expect(yellowLow.product_usage.details.login_frequency).toBe(50);

    // Below yellow
    const red = calculateHealthScore(makeMetrics({ login_count_30d: 4 }));
    expect(red.product_usage.details.login_frequency).toBe(0);
  });

  it('correctly scores boundary values for days since login', () => {
    const green = calculateHealthScore(makeMetrics({ days_since_last_login: 6 }));
    expect(green.engagement.details.days_since_login).toBe(100);

    const yellow = calculateHealthScore(makeMetrics({ days_since_last_login: 7 }));
    expect(yellow.engagement.details.days_since_login).toBe(50);

    const yellowHigh = calculateHealthScore(makeMetrics({ days_since_last_login: 14 }));
    expect(yellowHigh.engagement.details.days_since_login).toBe(50);

    const red = calculateHealthScore(makeMetrics({ days_since_last_login: 15 }));
    expect(red.engagement.details.days_since_login).toBe(0);
  });

  it('correctly scores NPS ranges', () => {
    const promoter = calculateHealthScore(makeMetrics({ nps_latest: 10 }));
    expect(promoter.relationship.details.nps).toBe(100);

    const passive = calculateHealthScore(makeMetrics({ nps_latest: 8 }));
    expect(passive.relationship.details.nps).toBe(50);

    const detractor = calculateHealthScore(makeMetrics({ nps_latest: 6 }));
    expect(detractor.relationship.details.nps).toBe(0);
  });

  it('correctly scores support tickets', () => {
    const low = calculateHealthScore(makeMetrics({ support_tickets_30d: 1 }));
    expect(low.support.details.tickets_30d).toBe(100);

    const medium = calculateHealthScore(makeMetrics({ support_tickets_30d: 3 }));
    expect(medium.support.details.tickets_30d).toBe(50);

    const high = calculateHealthScore(makeMetrics({ support_tickets_30d: 5 }));
    expect(high.support.details.tickets_30d).toBe(0);
  });

  it('produces scores between 0 and 100', () => {
    const scenarios: Partial<ClientMetrics>[] = [
      {},
      { login_count_30d: 0 },
      { nps_latest: 0, csat_latest: 1 },
      { days_since_last_login: 100 },
    ];

    for (const scenario of scenarios) {
      const result = calculateHealthScore(makeMetrics(scenario));
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(100);
      expect(['green', 'yellow', 'red']).toContain(result.tier);
    }
  });
});
