import type {
  ClientMetrics,
  CategoryScore,
  HealthScoreResult,
  HealthTier,
  PatientRecordsTrend,
  UsageTrend,
  ExecSponsorStatus,
} from '@/types';

// --- Scoring helpers ---

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function tierFromScore(score: number): HealthTier {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

// --- Sub-metric scorers ---

function scoreLoginFrequency(loginCount30d: number): number {
  if (loginCount30d >= 15) return 100;
  if (loginCount30d >= 5) return 50;
  return 0;
}

function scoreFeatureAdoption(featuresUsed: number): number {
  if (featuresUsed >= 5) return 100;
  if (featuresUsed >= 2) return 50;
  return 0;
}

function scorePatientRecordsTrend(trend: PatientRecordsTrend): number {
  switch (trend) {
    case 'growth':
    case 'stable':
      return 100;
    case 'flat':
      return 50;
    case 'declining':
      return 0;
  }
}

function scoreDaysSinceLogin(days: number): number {
  if (days < 7) return 100;
  if (days <= 14) return 50;
  return 0;
}

function scoreFeatureMoM(trend: UsageTrend): number {
  switch (trend) {
    case 'increasing':
      return 100;
    case 'flat':
      return 50;
    case 'decreasing':
      return 0;
  }
}

function scoreActionTiming(daysSinceLogin: number): number {
  // Proxy: stable = <7 days, slight increase = 7-14, significant = >14
  if (daysSinceLogin < 7) return 100;
  if (daysSinceLogin <= 14) return 50;
  return 0;
}

function scoreExecSponsor(status: ExecSponsorStatus): number {
  switch (status) {
    case 'active':
      return 100;
    case 'passive':
      return 50;
    case 'none':
      return 0;
  }
}

function scoreQBRAttendance(attended: number): number {
  if (attended >= 2) return 100;
  if (attended >= 1) return 50;
  return 0;
}

function scoreNPS(nps: number | null): number {
  if (nps === null) return 50; // neutral if no data
  if (nps >= 9) return 100;
  if (nps >= 7) return 50;
  return 0;
}

function scoreTickets30d(tickets: number): number {
  if (tickets <= 1) return 100;
  if (tickets <= 3) return 50;
  return 0;
}

function scoreEscalations(escalations: number): number {
  if (escalations === 0) return 100;
  if (escalations === 1) return 50;
  return 0;
}

function scoreCSAT(csat: number | null): number {
  if (csat === null) return 50; // neutral if no data
  if (csat >= 4) return 100;
  if (csat >= 3) return 50;
  return 0;
}

// --- Category calculators ---

function calculateProductUsage(metrics: ClientMetrics): CategoryScore {
  const loginFreq = scoreLoginFrequency(metrics.login_count_30d);
  const featureAdoption = scoreFeatureAdoption(metrics.features_used_count);
  const patientTrend = scorePatientRecordsTrend(metrics.patient_records_trend);

  const score = clamp(loginFreq * 0.4 + featureAdoption * 0.3 + patientTrend * 0.3);

  return {
    score,
    details: {
      login_frequency: loginFreq,
      feature_adoption: featureAdoption,
      patient_records_trend: patientTrend,
    },
  };
}

function calculateEngagement(metrics: ClientMetrics): CategoryScore {
  const daysSince = scoreDaysSinceLogin(metrics.days_since_last_login);
  const featureMoM = scoreFeatureMoM(metrics.feature_usage_mom_trend);
  const actionTiming = scoreActionTiming(metrics.days_since_last_login);

  const score = clamp(daysSince * 0.5 + featureMoM * 0.3 + actionTiming * 0.2);

  return {
    score,
    details: {
      days_since_login: daysSince,
      feature_mom: featureMoM,
      action_timing: actionTiming,
    },
  };
}

function calculateRelationship(metrics: ClientMetrics): CategoryScore {
  const execSponsor = scoreExecSponsor(metrics.exec_sponsor_status);
  const qbrAttendance = scoreQBRAttendance(metrics.qbrs_attended_last_2);
  const nps = scoreNPS(metrics.nps_latest);

  const score = clamp(execSponsor * 0.5 + qbrAttendance * 0.3 + nps * 0.2);

  return {
    score,
    details: {
      exec_sponsor: execSponsor,
      qbr_attendance: qbrAttendance,
      nps: nps,
    },
  };
}

function calculateSupport(metrics: ClientMetrics): CategoryScore {
  const tickets = scoreTickets30d(metrics.support_tickets_30d);
  const escalations = scoreEscalations(metrics.escalations_30d);
  const csat = scoreCSAT(metrics.csat_latest);

  const score = clamp(tickets * 0.4 + escalations * 0.4 + csat * 0.2);

  return {
    score,
    details: {
      tickets_30d: tickets,
      escalations: escalations,
      csat: csat,
    },
  };
}

// --- Main calculator ---

export function calculateHealthScore(metrics: ClientMetrics): HealthScoreResult {
  const productUsage = calculateProductUsage(metrics);
  const engagement = calculateEngagement(metrics);
  const relationship = calculateRelationship(metrics);
  const support = calculateSupport(metrics);

  const overall_score = clamp(
    productUsage.score * 0.4 +
    engagement.score * 0.3 +
    relationship.score * 0.2 +
    support.score * 0.1
  );

  return {
    overall_score,
    tier: tierFromScore(overall_score),
    product_usage: productUsage,
    engagement,
    relationship,
    support,
  };
}

export { tierFromScore };
