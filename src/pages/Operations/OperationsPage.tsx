/**
 * Operations Page - Operations Room Visualization
 * Main page for monitoring real-time agent activity
 */

import React from 'react';
import { MonitorPlay, Construction } from 'lucide-react';

/**
 * OperationsPage - Temporary placeholder
 */
export const OperationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <MonitorPlay size={64} className="text-cyan-400" />
              <Construction
                size={24}
                className="text-amber-400 absolute -bottom-1 -right-1"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Operations Room
          </h1>

          {/* Description */}
          <p className="text-slate-300 text-lg mb-6">
            Real-time agent activity visualization coming soon
          </p>

          {/* Details */}
          <div className="bg-slate-800 rounded-lg p-6 text-left space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Planned Features
            </h3>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Live visualization of Xandus and sub-agent activities</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Pixel art office with animated agents</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-1">•</span>
                <span>Real-time task flow and event stream</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-cyan-400 mt-1">•</span>
                <span>WebSocket-based live updates</span>
              </li>
            </ul>
          </div>

          {/* Status */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-300">
              <strong>Status:</strong> Backend infrastructure in development
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperationsPage;
