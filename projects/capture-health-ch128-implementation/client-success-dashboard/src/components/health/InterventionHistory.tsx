import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Phone,
  Mail,
  Users,
  BarChart3,
  GraduationCap,
  UserPlus,
  Crown,
  Monitor,
  AlertTriangle,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';
import type { Intervention, InterventionType, InterventionOutcome } from '@/types';

interface InterventionHistoryProps {
  interventions: Intervention[];
}

const typeIcons: Record<InterventionType, React.ReactNode> = {
  phone_call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <Users className="h-4 w-4" />,
  qbr: <BarChart3 className="h-4 w-4" />,
  training: <GraduationCap className="h-4 w-4" />,
  onboarding_session: <UserPlus className="h-4 w-4" />,
  executive_outreach: <Crown className="h-4 w-4" />,
  product_demo: <Monitor className="h-4 w-4" />,
  escalation_response: <AlertTriangle className="h-4 w-4" />,
  check_in: <MessageCircle className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const outcomeStyles: Record<InterventionOutcome, { className: string; label: string }> = {
  positive: { className: 'bg-emerald-100 text-emerald-800', label: 'Positive' },
  neutral: { className: 'bg-gray-100 text-gray-700', label: 'Neutral' },
  negative: { className: 'bg-red-100 text-red-800', label: 'Negative' },
  pending: { className: 'bg-blue-100 text-blue-800', label: 'Pending' },
  no_response: { className: 'bg-gray-100 text-gray-500', label: 'No Response' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InterventionHistory({ interventions }: InterventionHistoryProps) {
  if (interventions.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        No interventions recorded yet.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

      <div className="space-y-6">
        {interventions.map((intervention) => {
          const icon = typeIcons[intervention.intervention_type] ?? typeIcons.other;
          const outcome = intervention.outcome
            ? outcomeStyles[intervention.outcome]
            : null;

          return (
            <div key={intervention.id} className="relative flex gap-4 pl-0">
              {/* Timeline node */}
              <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600">
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {intervention.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {intervention.conducted_by && (
                        <span>by {intervention.conducted_by} &middot; </span>
                      )}
                      {formatDate(intervention.conducted_at)}
                    </p>
                  </div>

                  {outcome && (
                    <Badge
                      variant="secondary"
                      className={cn('text-xs border-0 shrink-0', outcome.className)}
                    >
                      {outcome.label}
                    </Badge>
                  )}
                </div>

                {intervention.description && (
                  <p className="text-sm text-gray-600 mt-1.5">{intervention.description}</p>
                )}

                {intervention.outcome_notes && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {intervention.outcome_notes}
                  </p>
                )}

                {(intervention.health_score_before != null ||
                  intervention.health_score_after != null) && (
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500">
                    {intervention.health_score_before != null && (
                      <span>Score before: {intervention.health_score_before}</span>
                    )}
                    {intervention.health_score_before != null &&
                      intervention.health_score_after != null && <span>&rarr;</span>}
                    {intervention.health_score_after != null && (
                      <span>Score after: {intervention.health_score_after}</span>
                    )}
                  </div>
                )}

                {intervention.follow_up_date && (
                  <div className="mt-1.5 text-xs text-gray-500">
                    Follow-up: {formatDate(intervention.follow_up_date)}
                    {intervention.follow_up_completed && (
                      <span className="ml-1 text-emerald-600">(completed)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
