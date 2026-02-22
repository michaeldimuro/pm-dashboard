/**
 * SubmissionHistoryView — Table of all submissions with expandable timelines
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useSubmissions, useStatusChanges } from '@/stores/appReviewStore';
import { StatusBadge } from '@/components/AppReview/StatusBadge';
import { ReviewTimeline } from '@/components/AppReview/ReviewTimeline';
import type { AppStoreVersionState } from '@/types/appReview';

type FilterOption = 'all' | 'approved' | 'rejected' | 'in_progress';

export const SubmissionHistoryView: React.FC = () => {
  const submissions = useSubmissions();
  const statusChanges = useStatusChanges();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === 'all') return true;
    if (filter === 'approved')
      return ['READY_FOR_SALE', 'PENDING_DEVELOPER_RELEASE', 'PROCESSING_FOR_APP_STORE'].includes(sub.current_status);
    if (filter === 'rejected')
      return ['REJECTED', 'METADATA_REJECTED'].includes(sub.current_status);
    if (filter === 'in_progress')
      return ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'PREPARE_FOR_SUBMISSION'].includes(sub.current_status);
    return true;
  });

  const filters: { value: FilterOption; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'in_progress', label: 'In Progress' },
  ];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex items-center gap-2">
        <Filter size={16} className="text-gray-500" />
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              filter === f.value
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-gray-400 hover:bg-[#1a1a3a] border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs text-gray-600 ml-2">
          {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-8 text-center">
          <p className="text-gray-500">No submissions match the current filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSubmissions.map((sub) => {
            const isExpanded = expandedId === sub.id;
            const subChanges = statusChanges.filter((c) => c.submission_id === sub.id);

            return (
              <div
                key={sub.id}
                className="bg-[#12122a] border border-[#1e1e3a] rounded-xl overflow-hidden"
              >
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-[#161638] transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-gray-500 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-gray-500 shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">
                        v{sub.version_string}
                      </span>
                      <StatusBadge
                        status={sub.current_status as AppStoreVersionState}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sub.platform}
                      {sub.build_number && ` · Build ${sub.build_number}`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">
                      {format(new Date(sub.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="text-right shrink-0 w-16">
                    <p className="text-xs text-gray-500">{subChanges.length} changes</p>
                  </div>
                </button>

                {/* Expanded Timeline */}
                {isExpanded && (
                  <div className="border-t border-[#1e1e3a] px-5 py-4 bg-[#0e0e24]">
                    {sub.rejection_reason && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
                        <p className="text-xs font-medium text-red-400 mb-1">Rejection Reason</p>
                        <p className="text-sm text-gray-300">{sub.rejection_reason}</p>
                      </div>
                    )}
                    <ReviewTimeline changes={subChanges} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
