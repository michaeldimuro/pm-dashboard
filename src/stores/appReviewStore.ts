/**
 * App Review Store
 * Zustand store for app review monitoring state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { AppReviewSubmission, AppReviewStatusChange, RejectionTemplate } from '../types/appReview';

interface AppReviewStoreState {
  currentSubmission: AppReviewSubmission | null;
  submissions: AppReviewSubmission[];
  statusChanges: AppReviewStatusChange[];
  templates: RejectionTemplate[];
  loading: boolean;
  error: string | null;

  setCurrentSubmission: (submission: AppReviewSubmission | null) => void;
  setSubmissions: (submissions: AppReviewSubmission[]) => void;
  updateSubmission: (submission: AppReviewSubmission) => void;
  setStatusChanges: (changes: AppReviewStatusChange[]) => void;
  addStatusChange: (change: AppReviewStatusChange) => void;
  setTemplates: (templates: RejectionTemplate[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAppReviewStore = create<AppReviewStoreState>()(
  devtools(
    (set) => ({
      currentSubmission: null,
      submissions: [],
      statusChanges: [],
      templates: [],
      loading: true,
      error: null,

      setCurrentSubmission: (submission) =>
        set({ currentSubmission: submission }, false, 'setCurrentSubmission'),

      setSubmissions: (submissions) =>
        set({ submissions }, false, 'setSubmissions'),

      updateSubmission: (submission) =>
        set((state) => {
          const submissions = state.submissions.map((s) =>
            s.id === submission.id ? submission : s
          );
          const isCurrent = state.currentSubmission?.id === submission.id;
          return {
            submissions,
            currentSubmission: isCurrent ? submission : state.currentSubmission,
          };
        }, false, 'updateSubmission'),

      setStatusChanges: (changes) =>
        set({ statusChanges: changes }, false, 'setStatusChanges'),

      addStatusChange: (change) =>
        set((state) => ({
          statusChanges: [change, ...state.statusChanges],
        }), false, 'addStatusChange'),

      setTemplates: (templates) =>
        set({ templates }, false, 'setTemplates'),

      setLoading: (loading) =>
        set({ loading }, false, 'setLoading'),

      setError: (error) =>
        set({ error }, false, 'setError'),
    }),
    { name: 'app-review-store', enabled: import.meta.env.DEV }
  )
);

// Selector hooks
export const useCurrentSubmission = () =>
  useAppReviewStore((state) => state.currentSubmission);

export const useSubmissions = () =>
  useAppReviewStore((state) => state.submissions);

export const useStatusChanges = () =>
  useAppReviewStore((state) => state.statusChanges);

export const useRejectionTemplates = () =>
  useAppReviewStore((state) => state.templates);

export const useAppReviewLoading = () =>
  useAppReviewStore((state) => state.loading);
