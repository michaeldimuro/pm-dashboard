/**
 * AgentCard — Status card for a single agent on the Operations Overview
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Search, Code, Bot, ChevronRight } from 'lucide-react';
import type { AgentProfile } from '@/types/operations';

interface AgentCardProps {
  profile: AgentProfile;
  activeTasks: number;
  currentActivity?: string;
}

const iconMap: Record<string, React.FC<any>> = {
  crown: Crown,
  search: Search,
  code: Code,
  bot: Bot,
};

const statusConfig: Record<string, { label: string; dotClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-green-400 animate-pulse' },
  dormant: { label: 'Dormant', dotClass: 'bg-gray-500' },
  disabled: { label: 'Disabled', dotClass: 'bg-red-500' },
};

export const AgentCard: React.FC<AgentCardProps> = ({ profile, activeTasks, currentActivity }) => {
  const navigate = useNavigate();
  const IconComponent = iconMap[profile.avatar_icon] || Bot;
  const status = statusConfig[profile.status] || statusConfig.dormant;

  return (
    <button
      onClick={() => navigate(`/operations/${profile.agent_id}`)}
      className="w-full text-left bg-[#12122a] border border-[#1e1e3a] rounded-xl p-5 hover:border-[#2a2a5a] hover:bg-[#161638] transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${profile.avatar_color}20` }}
          >
            <IconComponent size={20} style={{ color: profile.avatar_color }} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg">{profile.display_name}</h3>
            <p className="text-xs text-gray-500">{profile.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status.dotClass}`} />
          <span className="text-xs text-gray-400">{status.label}</span>
        </div>
      </div>

      {currentActivity && (
        <p className="text-sm text-gray-300 mb-3 truncate">{currentActivity}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">
          {activeTasks} {activeTasks === 1 ? 'task' : 'tasks'}
        </span>
        <ChevronRight
          size={16}
          className="text-gray-600 group-hover:text-gray-400 transition-colors"
        />
      </div>

      <div className="mt-3 pt-3 border-t border-[#1e1e3a]">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{profile.default_model}</span>
          {profile.total_cost_cents > 0 && (
            <span>${(profile.total_cost_cents / 100).toFixed(2)} total</span>
          )}
        </div>
      </div>
    </button>
  );
};
