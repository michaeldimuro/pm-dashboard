/**
 * AppReviewPage — Router wrapper with tab navigation
 * /app-review           → CurrentStatusView
 * /app-review/history   → SubmissionHistoryView
 * /app-review/templates → ResponseTemplatesView
 */

import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Activity, History, FileText } from 'lucide-react';
import { useAppReviewData } from '@/hooks/useAppReviewData';
import { CurrentStatusView } from './CurrentStatusView';
import { SubmissionHistoryView } from './SubmissionHistoryView';
import { ResponseTemplatesView } from './ResponseTemplatesView';

const tabs = [
  { icon: Activity, label: 'Current Status', path: '/app-review', end: true },
  { icon: History, label: 'History', path: '/app-review/history', end: false },
  { icon: FileText, label: 'Templates', path: '/app-review/templates', end: false },
];

export const AppReviewPage: React.FC = () => {
  const { loading } = useAppReviewData();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
          <span className="text-gray-400 text-sm">Loading App Review data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Header */}
      <div className="border-b border-[#1e1e3a] px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-white mb-4">App Review Monitor</h1>
          {/* Tab Navigation */}
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path}
                end={tab.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:bg-[#1a1a3a] hover:text-white border border-transparent'
                  }`
                }
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Routes>
          <Route index element={<CurrentStatusView />} />
          <Route path="history" element={<SubmissionHistoryView />} />
          <Route path="templates" element={<ResponseTemplatesView />} />
        </Routes>
      </div>
    </div>
  );
};

export default AppReviewPage;
