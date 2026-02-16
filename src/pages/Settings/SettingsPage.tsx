import React, { useState } from 'react';
import { User, Bell, Shield, Palette, Save, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email] = useState(user?.email || '');

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [webhookNotifications, setWebhookNotifications] = useState(true);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('users').update({ full_name: fullName }).eq('id', user?.id);
      if (error) throw error;
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="glass rounded-xl overflow-hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition ${
                  activeTab === tab.id
                    ? 'bg-indigo-600/20 text-indigo-400 border-l-4 border-indigo-500'
                    : 'text-gray-400 hover:bg-[#1a1a3a] hover:text-white'
                }`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="glass rounded-xl p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>

                <div className="flex items-center gap-4 mb-6">
                  <div className="w-20 h-20 rounded-full gradient-accent flex items-center justify-center text-white text-2xl font-bold">
                    {fullName?.charAt(0) || 'U'}
                  </div>
                  <button className="px-4 py-2 bg-[#1a1a3a] text-gray-300 rounded-lg hover:bg-[#2a2a4a] transition">
                    Change Avatar
                  </button>
                </div>

                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2 bg-[#0a0a1a] border border-[#2a2a4a] rounded-lg text-gray-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Contact support to change your email</p>
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white mb-4">Notification Preferences</h2>

                <div className="space-y-4">
                  {[
                    { label: 'Email Notifications', desc: 'Receive email updates about your tasks and leads', value: emailNotifications, setter: setEmailNotifications },
                    { label: 'Push Notifications', desc: 'Receive push notifications in your browser', value: pushNotifications, setter: setPushNotifications },
                    { label: 'Webhook Events', desc: 'Send webhook notifications to external services', value: webhookNotifications, setter: setWebhookNotifications },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-4 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg">
                      <div>
                        <p className="font-medium text-white">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={item.value}
                          onChange={(e) => item.setter(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-[#2a2a4a] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white mb-4">Security Settings</h2>

                <div className="space-y-4 max-w-md">
                  {['Current Password', 'New Password', 'Confirm New Password'].map((label) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
                      <input
                        type="password"
                        className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>
                  ))}

                  <button className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition">
                    Update Password
                  </button>
                </div>

                <hr className="border-[#2a2a4a] my-6" />

                <div>
                  <h3 className="font-medium text-white mb-2">Danger Zone</h3>
                  <p className="text-sm text-gray-500 mb-4">Once you delete your account, there is no going back.</p>
                  <button className="px-4 py-2 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 transition">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-white mb-4">Appearance</h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Theme</label>
                    <div className="flex gap-3">
                      <button className="flex-1 p-4 border-2 border-[#2a2a4a] rounded-lg text-center bg-[#1a1a3a]">
                        <div className="w-full h-12 bg-gray-100 rounded mb-2"></div>
                        <span className="text-sm font-medium text-gray-400">Light</span>
                      </button>
                      <button className="flex-1 p-4 border-2 border-indigo-500 rounded-lg text-center bg-[#0a0a1a]">
                        <div className="w-full h-12 bg-[#1a1a3a] rounded mb-2"></div>
                        <span className="text-sm font-medium text-white">Dark</span>
                      </button>
                      <button className="flex-1 p-4 border-2 border-[#2a2a4a] rounded-lg text-center bg-[#1a1a3a]">
                        <div className="w-full h-12 bg-gradient-to-r from-gray-100 to-gray-800 rounded mb-2"></div>
                        <span className="text-sm font-medium text-gray-400">System</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-3">Accent Color</label>
                    <div className="flex gap-3">
                      {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4'].map((color) => (
                        <button
                          key={color}
                          className={`w-10 h-10 rounded-full border-2 hover:scale-110 transition ${color === '#6366f1' ? 'border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
