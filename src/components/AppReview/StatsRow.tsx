/**
 * StatsRow — Metric cards for app review stats
 */

import React from 'react';
import { Clock, Hash, CheckCircle, TrendingUp } from 'lucide-react';
import type { AppReviewSubmission, AppReviewStatusChange } from '@/types/appReview';

interface StatsRowProps {
  submissions: AppReviewSubmission[];
  statusChanges: AppReviewStatusChange[];
}

export const StatsRow: React.FC<StatsRowProps> = ({ submissions, statusChanges }) => {
  // Calculate average review time (from WAITING_FOR_REVIEW to terminal state)
  const reviewDurations: number[] = [];
  for (const sub of submissions) {
    if (sub.review_started_at && sub.review_ended_at) {
      const start = new Date(sub.review_started_at).getTime();
      const end = new Date(sub.review_ended_at).getTime();
      if (end > start) reviewDurations.push(end - start);
    }
  }
  const avgReviewMs = reviewDurations.length > 0
    ? reviewDurations.reduce((a, b) => a + b, 0) / reviewDurations.length
    : 0;

  // Total submissions
  const totalSubmissions = submissions.length;

  // Approval rate
  const approved = submissions.filter((s) =>
    ['READY_FOR_SALE', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_APP_STORE'].includes(s.current_status)
  ).length;
  const rejected = submissions.filter((s) =>
    ['REJECTED', 'METADATA_REJECTED'].includes(s.current_status)
  ).length;
  const decided = approved + rejected;
  const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;

  // Current streak (consecutive approvals)
  let streak = 0;
  const sorted = [...submissions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  for (const sub of sorted) {
    if (['READY_FOR_SALE', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_APP_STORE'].includes(sub.current_status)) {
      streak++;
    } else if (['REJECTED', 'METADATA_REJECTED'].includes(sub.current_status)) {
      break;
    }
  }

  const stats = [
    {
      icon: Clock,
      label: 'Avg Review Time',
      value: avgReviewMs > 0 ? formatDuration(avgReviewMs) : 'N/A',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Hash,
      label: 'Total Submissions',
      value: String(totalSubmissions),
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      icon: CheckCircle,
      label: 'Approval Rate',
      value: decided > 0 ? `${approvalRate}%` : 'N/A',
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      icon: TrendingUp,
      label: 'Current Streak',
      value: streak > 0 ? `${streak} approved` : 'N/A',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.bgColor}`}>
              <stat.icon size={16} className={stat.color} />
            </div>
          </div>
          <p className="text-xl font-bold text-white">{stat.value}</p>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(ms / 60000)}m`;
}
