/**
 * CurrentStatusView — Hero status card + timeline + stats + quick actions
 */

import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Bell } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useCurrentSubmission, useSubmissions, useStatusChanges } from '@/stores/appReviewStore';
import { StatusBadge } from '@/components/AppReview/StatusBadge';
import { ReviewTimeline } from '@/components/AppReview/ReviewTimeline';
import { StatsRow } from '@/components/AppReview/StatsRow';
import { triggerCheckNow, triggerTestNotification } from '@/hooks/useAppReviewData';
import type { AppStoreVersionState } from '@/types/appReview';

export const CurrentStatusView: React.FC = () => {
  const currentSubmission = useCurrentSubmission();
  const submissions = useSubmissions();
  const statusChanges = useStatusChanges();
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleCheckNow = async () => {
    setChecking(true);
    await triggerCheckNow();
    setChecking(false);
  };

  const handleTestNotification = async () => {
    setTesting(true);
    await triggerTestNotification();
    setTesting(false);
  };

  // Filter status changes for current submission
  const currentChanges = currentSubmission
    ? statusChanges.filter((c) => c.submission_id === currentSubmission.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <StatsRow submissions={submissions} statusChanges={statusChanges} />

      {/* Hero Status Card */}
      <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-6">
        {currentSubmission ? (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">
                    v{currentSubmission.version_string}
                  </h2>
                  <StatusBadge
                    status={currentSubmission.current_status as AppStoreVersionState}
                    size="lg"
                  />
                </div>
                <p className="text-sm text-gray-400">
                  {currentSubmission.platform} &middot;{' '}
                  {currentSubmission.build_number && `Build ${currentSubmission.build_number} · `}
                  Updated {formatDistanceToNow(new Date(currentSubmission.updated_at), { addSuffix: true })}
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCheckNow}
                  disabled={checking}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors disabled:opacity-50"
                >
                  <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                  Check Now
                </button>
                <button
                  onClick={handleTestNotification}
                  disabled={testing}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1a1a3a] text-gray-400 border border-[#2a2a5a] hover:text-white transition-colors disabled:opacity-50"
                >
                  <Bell size={14} />
                  Test Alert
                </button>
                <a
                  href="https://appstoreconnect.apple.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-[#1a1a3a] text-gray-400 border border-[#2a2a5a] hover:text-white transition-colors"
                >
                  <ExternalLink size={14} />
                  ASC
                </a>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <TimestampCard
                label="Submitted"
                timestamp={currentSubmission.submitted_at}
              />
              <TimestampCard
                label="Review Started"
                timestamp={currentSubmission.review_started_at}
              />
              <TimestampCard
                label="Review Ended"
                timestamp={currentSubmission.review_ended_at}
              />
            </div>

            {/* Rejection Info */}
            {(currentSubmission.current_status === 'REJECTED' ||
              currentSubmission.current_status === 'METADATA_REJECTED') && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-red-400 mb-2">Rejection Details</h3>
                {currentSubmission.rejection_reason && (
                  <p className="text-sm text-gray-300 mb-2">{currentSubmission.rejection_reason}</p>
                )}
                {currentSubmission.rejection_guideline_code && (
                  <p className="text-xs text-gray-500">
                    Guideline: {currentSubmission.rejection_guideline_code}
                  </p>
                )}
                {currentSubmission.draft_response && (
                  <div className="mt-3 pt-3 border-t border-red-500/20">
                    <h4 className="text-xs font-medium text-gray-400 mb-1">Draft Response</h4>
                    <p className="text-sm text-gray-300">{currentSubmission.draft_response}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No submissions tracked yet</p>
            <button
              onClick={handleCheckNow}
              disabled={checking}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors disabled:opacity-50 mx-auto"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              Fetch from App Store Connect
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      {currentChanges.length > 0 && (
        <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Status Timeline</h3>
          <ReviewTimeline changes={currentChanges} />
        </div>
      )}
    </div>
  );
};

function TimestampCard({ label, timestamp }: { label: string; timestamp: string | null }) {
  return (
    <div className="bg-[#0a0a1a] border border-[#1e1e3a] rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      {timestamp ? (
        <>
          <p className="text-sm text-white">{format(new Date(timestamp), 'MMM d, yyyy')}</p>
          <p className="text-xs text-gray-400">{format(new Date(timestamp), 'h:mm a')}</p>
        </>
      ) : (
        <p className="text-sm text-gray-600">--</p>
      )}
    </div>
  );
}
