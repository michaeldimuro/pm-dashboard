/**
 * App Store Review Monitoring Types
 */

export type AppStoreVersionState =
  | 'PREPARE_FOR_SUBMISSION'
  | 'WAITING_FOR_REVIEW'
  | 'IN_REVIEW'
  | 'PENDING_DEVELOPER_RELEASE'
  | 'PROCESSING_FOR_APP_STORE'
  | 'READY_FOR_SALE'
  | 'DEVELOPER_REJECTED'
  | 'REJECTED'
  | 'METADATA_REJECTED'
  | 'REMOVED_FROM_SALE'
  | 'DEVELOPER_REMOVED_FROM_SALE'
  | 'INVALID_BINARY'
  | 'REPLACED_WITH_NEW_VERSION'
  | 'NOT_APPLICABLE';

export interface AppReviewSubmission {
  id: string;
  version_string: string;
  version_id: string;
  platform: string;
  current_status: AppStoreVersionState;
  submitted_at: string | null;
  review_started_at: string | null;
  review_ended_at: string | null;
  rejection_reason: string | null;
  rejection_guideline_code: string | null;
  draft_response: string | null;
  response_sent: boolean;
  app_store_url: string | null;
  build_number: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AppReviewStatusChange {
  id: string;
  submission_id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  notified: boolean;
  notification_sent_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RejectionTemplate {
  id: string;
  guideline_code: string;
  guideline_title: string;
  response_template: string;
  tips: string[];
  severity: string;
  created_at: string;
  updated_at: string;
}

/** Status categories for UI display */
export type StatusCategory = 'success' | 'review' | 'waiting' | 'rejected' | 'neutral';

export const STATUS_CONFIG: Record<AppStoreVersionState, { label: string; category: StatusCategory; emoji: string }> = {
  PREPARE_FOR_SUBMISSION: { label: 'Preparing', category: 'neutral', emoji: '📝' },
  WAITING_FOR_REVIEW: { label: 'Waiting for Review', category: 'waiting', emoji: '⏳' },
  IN_REVIEW: { label: 'In Review', category: 'review', emoji: '🔍' },
  PENDING_DEVELOPER_RELEASE: { label: 'Pending Release', category: 'success', emoji: '✅' },
  PROCESSING_FOR_APP_STORE: { label: 'Processing', category: 'waiting', emoji: '⚙️' },
  READY_FOR_SALE: { label: 'Live', category: 'success', emoji: '🟢' },
  DEVELOPER_REJECTED: { label: 'Dev Rejected', category: 'neutral', emoji: '↩️' },
  REJECTED: { label: 'Rejected', category: 'rejected', emoji: '❌' },
  METADATA_REJECTED: { label: 'Metadata Rejected', category: 'rejected', emoji: '📋' },
  REMOVED_FROM_SALE: { label: 'Removed', category: 'neutral', emoji: '🚫' },
  DEVELOPER_REMOVED_FROM_SALE: { label: 'Dev Removed', category: 'neutral', emoji: '🚫' },
  INVALID_BINARY: { label: 'Invalid Binary', category: 'rejected', emoji: '⚠️' },
  REPLACED_WITH_NEW_VERSION: { label: 'Replaced', category: 'neutral', emoji: '🔄' },
  NOT_APPLICABLE: { label: 'N/A', category: 'neutral', emoji: '—' },
};
