import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface SubScoreBreakdownProps {
  productUsage: number;
  engagement: number;
  relationship: number;
  support: number;
}

interface ScoreCategory {
  label: string;
  weight: string;
  value: number;
}

function getBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-700';
  if (score >= 50) return 'text-amber-700';
  return 'text-red-700';
}

export function SubScoreBreakdown({
  productUsage,
  engagement,
  relationship,
  support,
}: SubScoreBreakdownProps) {
  const categories: ScoreCategory[] = [
    { label: 'Product Usage', weight: '40%', value: productUsage },
    { label: 'Engagement', weight: '30%', value: engagement },
    { label: 'Relationship', weight: '20%', value: relationship },
    { label: 'Support', weight: '10%', value: support },
  ];

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">{category.label}</span>
              <span className="text-xs text-gray-400">({category.weight})</span>
            </div>
            <span className={cn('font-semibold', getTextColor(category.value))}>
              {category.value}
            </span>
          </div>
          <div className="relative">
            <Progress
              value={category.value}
              className="h-2 bg-gray-100"
            />
            {/* Colored overlay since shadcn Progress uses CSS variables */}
            <div
              className={cn(
                'absolute top-0 left-0 h-2 rounded-full transition-all',
                getBarColor(category.value)
              )}
              style={{ width: `${Math.max(0, Math.min(100, category.value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
