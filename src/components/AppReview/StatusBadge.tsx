/**
 * StatusBadge — Color-coded badge for App Store review status
 */

import React from 'react';
import type { AppStoreVersionState, StatusCategory } from '@/types/appReview';
import { STATUS_CONFIG } from '@/types/appReview';

interface StatusBadgeProps {
  status: AppStoreVersionState;
  size?: 'sm' | 'md' | 'lg';
}

const categoryStyles: Record<StatusCategory, string> = {
  success: 'bg-green-500/15 text-green-400 border-green-500/30',
  review: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  waiting: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  neutral: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
};

const sizeStyles = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.NOT_APPLICABLE;
  const styles = categoryStyles[config.category];
  const sizeStyle = sizeStyles[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${styles} ${sizeStyle}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
};
