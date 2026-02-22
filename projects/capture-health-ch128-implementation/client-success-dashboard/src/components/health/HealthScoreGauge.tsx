import type { HealthTier } from '@/types';

interface HealthScoreGaugeProps {
  score: number;
  tier: HealthTier;
  size?: number;
}

const tierColors: Record<HealthTier, string> = {
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
};

const tierLabels: Record<HealthTier, string> = {
  green: 'Healthy',
  yellow: 'At Risk',
  red: 'Critical',
};

export function HealthScoreGauge({ score, tier, size = 200 }: HealthScoreGaugeProps) {
  const color = tierColors[tier];
  const label = tierLabels[tier];

  // SVG dimensions and arc calculations
  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const centerX = size / 2;
  const centerY = size / 2 + size * 0.05;

  // Semicircle arc: from 180 degrees (left) to 0 degrees (right)
  const startAngle = Math.PI;
  const endAngle = 0;
  const totalAngle = Math.PI;

  // Clamp score to 0-100
  const clampedScore = Math.max(0, Math.min(100, score));
  const filledAngle = startAngle - (clampedScore / 100) * totalAngle;

  // Background arc path (full semicircle)
  const bgStartX = centerX + radius * Math.cos(startAngle);
  const bgStartY = centerY - radius * Math.sin(startAngle);
  const bgEndX = centerX + radius * Math.cos(endAngle);
  const bgEndY = centerY - radius * Math.sin(endAngle);

  const bgPath = `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${totalAngle > Math.PI ? 1 : 0} 1 ${bgEndX} ${bgEndY}`;

  // Filled arc path (proportional to score)
  const fillEndX = centerX + radius * Math.cos(filledAngle);
  const fillEndY = centerY - radius * Math.sin(filledAngle);
  const filledArcAngle = startAngle - filledAngle;
  const largeArcFlag = filledArcAngle > Math.PI ? 1 : 0;

  const fillPath =
    clampedScore > 0
      ? `M ${bgStartX} ${bgStartY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${fillEndX} ${fillEndY}`
      : '';

  return (
    <svg
      width={size}
      height={size * 0.65}
      viewBox={`0 0 ${size} ${size * 0.65}`}
      className="overflow-visible"
    >
      {/* Background arc */}
      <path
        d={bgPath}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Filled arc */}
      {clampedScore > 0 && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      )}

      {/* Score number in center */}
      <text
        x={centerX}
        y={centerY - size * 0.05}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-bold"
        fontSize={size * 0.22}
        fill={color}
      >
        {clampedScore}
      </text>

      {/* Tier label below score */}
      <text
        x={centerX}
        y={centerY + size * 0.12}
        textAnchor="middle"
        dominantBaseline="middle"
        className="font-medium"
        fontSize={size * 0.09}
        fill="#6b7280"
      >
        {label}
      </text>
    </svg>
  );
}
