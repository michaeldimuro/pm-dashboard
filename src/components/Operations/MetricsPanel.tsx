/**
 * MetricsPanel — Token/cost/task metrics display
 */

import React from 'react';
import type { AggregatedMetrics } from '@/types/operations';

interface MetricsPanelProps {
  metrics: AggregatedMetrics;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const formatCost = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="bg-[#12122a] border border-[#1e1e3a] rounded-xl">
      <div className="px-4 py-3 border-b border-[#1e1e3a]">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Metrics
        </h3>
      </div>
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500">
              <th className="text-left font-medium pb-2"></th>
              <th className="text-right font-medium pb-2">Today</th>
              <th className="text-right font-medium pb-2">Week</th>
              <th className="text-right font-medium pb-2">Month</th>
            </tr>
          </thead>
          <tbody className="text-gray-400">
            <tr className="border-t border-[#1e1e3a]">
              <td className="py-2 text-gray-300">Tasks Done</td>
              <td className="py-2 text-right font-mono">{metrics.today.tasks}</td>
              <td className="py-2 text-right font-mono">{metrics.week.tasks}</td>
              <td className="py-2 text-right font-mono">{metrics.month.tasks}</td>
            </tr>
            <tr className="border-t border-[#1e1e3a]">
              <td className="py-2 text-gray-300">Sessions</td>
              <td className="py-2 text-right font-mono">{metrics.today.sessions}</td>
              <td className="py-2 text-right font-mono">{metrics.week.sessions}</td>
              <td className="py-2 text-right font-mono">{metrics.month.sessions}</td>
            </tr>
            <tr className="border-t border-[#1e1e3a]">
              <td className="py-2 text-gray-300">Est. Cost</td>
              <td className="py-2 text-right font-mono">{formatCost(metrics.today.cost_cents)}</td>
              <td className="py-2 text-right font-mono">{formatCost(metrics.week.cost_cents)}</td>
              <td className="py-2 text-right font-mono">{formatCost(metrics.month.cost_cents)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
