/**
 * AgentHeader — Header for the agent detail page with back nav + status
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Crown, Search, Code, Bot } from 'lucide-react';
import type { AgentProfile } from '@/types/operations';

interface AgentHeaderProps {
  profile: AgentProfile;
}

const iconMap: Record<string, React.FC<any>> = {
  crown: Crown,
  search: Search,
  code: Code,
  bot: Bot,
};

const statusConfig: Record<string, { label: string; dotClass: string; textClass: string }> = {
  active: { label: 'Active', dotClass: 'bg-green-400 animate-pulse', textClass: 'text-green-400' },
  dormant: { label: 'Dormant', dotClass: 'bg-gray-500', textClass: 'text-gray-400' },
  disabled: { label: 'Disabled', dotClass: 'bg-red-500', textClass: 'text-red-400' },
};

export const AgentHeader: React.FC<AgentHeaderProps> = ({ profile }) => {
  const navigate = useNavigate();
  const IconComponent = iconMap[profile.avatar_icon] || Bot;
  const status = statusConfig[profile.status] || statusConfig.dormant;

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/operations')}
          className="p-2 hover:bg-[#1a1a3a] rounded-lg transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-400" />
        </button>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${profile.avatar_color}20` }}
        >
          <IconComponent size={24} style={{ color: profile.avatar_color }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.display_name}</h1>
          <p className="text-sm text-gray-400">{profile.role}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${status.dotClass}`} />
        <span className={`text-sm font-medium ${status.textClass}`}>{status.label}</span>
      </div>
    </div>
  );
};
