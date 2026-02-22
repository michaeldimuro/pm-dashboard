import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { HealthTier } from '@/types';

interface HealthScoreBadgeProps {
  score: number;
  tier: HealthTier;
  size?: 'sm' | 'md' | 'lg';
}

const tierStyles: Record<HealthTier, string> = {
  green: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  yellow: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  red: 'bg-red-100 text-red-800 hover:bg-red-100',
};

const sizeStyles: Record<string, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-base px-3 py-1 font-semibold',
};

export function HealthScoreBadge({ score, tier, size = 'md' }: HealthScoreBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'font-medium border-0',
        tierStyles[tier],
        sizeStyles[size]
      )}
    >
      {score}
    </Badge>
  );
}
