import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  Calendar,
  StickyNote,
  Users,
  Webhook,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Rocket,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: KanbanSquare, label: 'Kanban', path: '/kanban' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: StickyNote, label: 'Notes', path: '/notes' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: Webhook, label: 'Webhooks', path: '/webhooks' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0f0f23] text-white flex flex-col transition-all duration-300 z-50 border-r border-[#1a1a3a] ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[#1a1a3a]">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center">
              <Rocket size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Mission Control
            </span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 gradient-accent rounded-lg flex items-center justify-center mx-auto">
            <Rocket size={18} className="text-white" />
          </div>
        )}
        <button
          onClick={onToggle}
          className={`p-2 hover:bg-[#1a1a3a] rounded-lg transition-colors ${collapsed ? 'hidden' : ''}`}
        >
          <ChevronLeft size={20} className="text-gray-400" />
        </button>
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="p-2 hover:bg-[#1a1a3a] transition-colors border-b border-[#1a1a3a]"
        >
          <ChevronRight size={20} className="text-gray-400 mx-auto" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      : 'text-gray-400 hover:bg-[#1a1a3a] hover:text-white border border-transparent'
                  } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-[#1a1a3a]">
        {collapsed ? (
          <button
            onClick={signOut}
            className="w-10 h-10 flex items-center justify-center hover:bg-[#1a1a3a] rounded-lg transition-colors mx-auto"
            title="Sign Out"
          >
            <LogOut size={20} className="text-gray-400" />
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-sm font-medium text-white">
                {user?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-[#1a1a3a] hover:text-white rounded-lg transition-colors"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
