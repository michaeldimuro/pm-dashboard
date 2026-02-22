/**
 * ReviewTimeline — Vertical timeline of status transitions
 */

import React from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import type { AppReviewStatusChange, AppStoreVersionState } from '@/types/appReview';
import { STATUS_CONFIG } from '@/types/appReview';

interface ReviewTimelineProps {
  changes: AppReviewStatusChange[];
  maxItems?: number;
}

const categoryDotColors: Record<string, string> = {
  success: 'bg-green-400',
  review: 'bg-blue-400',
  waiting: 'bg-yellow-400',
  rejected: 'bg-red-400',
  neutral: 'bg-gray-400',
};

export const ReviewTimeline: React.FC<ReviewTimelineProps> = ({ changes, maxItems = 20 }) => {
  const displayChanges = changes.slice(0, maxItems);

  if (displayChanges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No status changes recorded yet
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-px bg-[#1e1e3a]" />

      <div className="space-y-4">
        {displayChanges.map((change, index) => {
          const config = STATUS_CONFIG[change.to_status as AppStoreVersionState];
          const dotColor = config
            ? categoryDotColors[config.category]
            : 'bg-gray-400';
          const changedDate = new Date(change.changed_at);

          // Calculate duration from previous change
          const nextChange = displayChanges[index + 1];
          const duration = nextChange
            ? Math.abs(changedDate.getTime() - new Date(nextChange.changed_at).getTime())
            : null;

          return (
            <div key={change.id} className="relative pl-8">
              {/* Dot */}
              <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full ${dotColor} ring-2 ring-[#0a0a1a]`} />

              <div className="bg-[#12122a] border border-[#1e1e3a] rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {config?.emoji} {config?.label || change.to_status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(changedDate, { addSuffix: true })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span>{format(changedDate, 'MMM d, yyyy h:mm a')}</span>
                  {change.from_status && (
                    <>
                      <span className="text-gray-600">from</span>
                      <span>{change.from_status.replace(/_/g, ' ')}</span>
                    </>
                  )}
                </div>

                {duration !== null && duration > 0 && (
                  <div className="mt-1 text-xs text-gray-500">
                    Duration: {formatDuration(duration)}
                  </div>
                )}

                {change.notified && (
                  <div className="mt-1 text-xs text-green-500/70">Notification sent</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
