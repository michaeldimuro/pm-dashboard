import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Building2,
  Calendar,
  Edit2,
  Trash2,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useBusiness } from '@/contexts/BusinessContext';
import { supabase } from '@/lib/supabase';
import type { Lead, LeadStatus, Business } from '@/types';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  contacted: { label: 'Contacted', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.2)' },
  qualified: { label: 'Qualified', color: '#06b6d4', bgColor: 'rgba(6, 182, 212, 0.2)' },
  proposal_sent: { label: 'Proposal Sent', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)' },
  negotiating: { label: 'Negotiating', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.2)' },
  won: { label: 'Won', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' },
  lost: { label: 'Lost', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
};

const SOURCES = ['Website', 'Referral', 'ANGI', 'Cold Call', 'Social Media', 'Other'];

export function LeadsPage() {
  const { user } = useAuth();
  const { businesses, getBusinessName, getBusinessColor } = useBusiness();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [businessFilter, setBusinessFilter] = useState<Business | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'created_at' | 'value' | 'name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Form state
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadCompany, setLeadCompany] = useState('');
  const [leadSource, setLeadSource] = useState('Website');
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('new');
  const [leadBusiness, setLeadBusiness] = useState<Business>('synergy');
  const [leadValue, setLeadValue] = useState('');
  const [leadNotes, setLeadNotes] = useState('');
  const [nextFollowup, setNextFollowup] = useState('');

  useEffect(() => {
    // Wait for authReady to prevent AbortError from race conditions
    if (user) {
      fetchLeads();
    }
  }, [user, sortBy, sortDir]);

  const fetchLeads = async () => {
    setLoading(true);
    // Fetch ALL leads across all businesses
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user?.id)
      .order(sortBy, { ascending: sortDir === 'asc' });

    if (error) {
      console.error('Error fetching leads:', error);
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesBusiness = businessFilter === 'all' || lead.business === businessFilter;

    return matchesSearch && matchesStatus && matchesBusiness;
  });

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();

    const leadData = {
      user_id: user?.id,
      business: leadBusiness,
      name: leadName,
      email: leadEmail || null,
      phone: leadPhone || null,
      company: leadCompany || null,
      source: leadSource,
      status: leadStatus,
      value: leadValue ? parseFloat(leadValue) : null,
      notes: leadNotes || null,
      next_followup: nextFollowup || null,
      last_contacted: leadStatus !== 'new' ? new Date().toISOString() : null,
    };

    if (editingLead) {
      const { error } = await supabase.from('leads').update(leadData).eq('id', editingLead.id);
      if (error) console.error('Error updating lead:', error);
    } else {
      const { error } = await supabase.from('leads').insert(leadData);
      if (error) console.error('Error creating lead:', error);
    }

    fetchLeads();
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Delete this lead?')) return;
    const { error } = await supabase.from('leads').delete().eq('id', leadId);
    if (error) console.error('Error deleting lead:', error);
    else fetchLeads();
  };

  const handleUpdateStatus = async (leadId: string, newStatus: LeadStatus) => {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus, last_contacted: new Date().toISOString() })
      .eq('id', leadId);
    if (error) console.error('Error updating lead status:', error);
    else fetchLeads();
  };

  const resetForm = () => {
    setLeadName('');
    setLeadEmail('');
    setLeadPhone('');
    setLeadCompany('');
    setLeadSource('Website');
    setLeadStatus('new');
    setLeadBusiness('synergy');
    setLeadValue('');
    setLeadNotes('');
    setNextFollowup('');
    setEditingLead(null);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setLeadName(lead.name);
    setLeadEmail(lead.email || '');
    setLeadPhone(lead.phone || '');
    setLeadCompany(lead.company || '');
    setLeadSource(lead.source);
    setLeadStatus(lead.status);
    setLeadBusiness(lead.business);
    setLeadValue(lead.value?.toString() || '');
    setLeadNotes(lead.notes || '');
    setNextFollowup(lead.next_followup ? lead.next_followup.split('T')[0] : '');
    setIsModalOpen(true);
  };

  const toggleSort = (field: 'created_at' | 'value' | 'name') => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  const pipelineValue = leads.filter((l) => !['won', 'lost'].includes(l.status)).reduce((sum, l) => sum + (l.value || 0), 0);
  const wonValue = leads.filter((l) => l.status === 'won').reduce((sum, l) => sum + (l.value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Leads</h1>
          <p className="text-gray-400 mt-1">Track and manage leads across all businesses</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
        >
          <Plus size={20} />
          Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-gray-400">Total Leads</p>
          <p className="text-2xl font-bold text-white">{leads.length}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-gray-400">Pipeline Value</p>
          <p className="text-2xl font-bold text-blue-400">${pipelineValue.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-sm text-gray-400">Won Value</p>
          <p className="text-2xl font-bold text-green-400">${wonValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg px-3 py-2 flex-1">
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leads..."
            className="bg-transparent outline-none text-sm flex-1 text-white placeholder-gray-500"
          />
        </div>
        <select
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value as Business | 'all')}
          className="px-4 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | 'all')}
          className="px-4 py-2 bg-[#12122a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center">
          <h3 className="text-lg font-medium text-white mb-2">No leads yet</h3>
          <p className="text-gray-400 mb-4">Start tracking your leads</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
          >
            <Plus size={20} />
            Add Lead
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1a1a3a] border-b border-[#2a2a4a]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => toggleSort('name')}>
                    <div className="flex items-center gap-1">Name <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Contact</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Business</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400 cursor-pointer hover:text-white" onClick={() => toggleSort('value')}>
                    <div className="flex items-center gap-1">Value <ArrowUpDown size={14} /></div>
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Next Follow-up</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a2a4a]">
                {filteredLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status];
                  return (
                    <tr key={lead.id} className="hover:bg-[#1a1a3a]/50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{lead.name}</p>
                          {lead.company && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Building2 size={12} />
                              {lead.company}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {lead.email && (
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Mail size={12} />
                              {lead.email}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-sm text-gray-400 flex items-center gap-1">
                              <Phone size={12} />
                              {lead.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: getBusinessColor(lead.business) + '30',
                            color: getBusinessColor(lead.business),
                          }}
                        >
                          {getBusinessName(lead.business)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleUpdateStatus(lead.id, e.target.value as LeadStatus)}
                          className="text-xs px-2 py-1 rounded-full border-0 cursor-pointer"
                          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                        >
                          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                            <option key={status} value={status}>{config.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        {lead.value ? (
                          <span className="text-sm font-medium text-white">${lead.value.toLocaleString()}</span>
                        ) : (
                          <span className="text-sm text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lead.next_followup ? (
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(lead.next_followup), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEditModal(lead)} className="p-1 hover:bg-[#2a2a4a] rounded">
                            <Edit2 size={16} className="text-gray-400" />
                          </button>
                          <button onClick={() => handleDeleteLead(lead.id)} className="p-1 hover:bg-[#2a2a4a] rounded">
                            <Trash2 size={16} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Lead Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-[#12122a] border border-[#2a2a4a] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#2a2a4a] flex items-center justify-between sticky top-0 bg-[#12122a]">
              <h2 className="text-lg font-semibold text-white">{editingLead ? 'Edit Lead' : 'New Lead'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveLead} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    required
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Lead name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Company</label>
                  <input
                    type="text"
                    value={leadCompany}
                    onChange={(e) => setLeadCompany(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business *</label>
                  <select
                    value={leadBusiness}
                    onChange={(e) => setLeadBusiness(e.target.value as Business)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Source *</label>
                  <select
                    value={leadSource}
                    onChange={(e) => setLeadSource(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {SOURCES.map((source) => (
                      <option key={source} value={source}>{source}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                  <select
                    value={leadStatus}
                    onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <option key={status} value={status}>{config.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Value ($)</label>
                  <input
                    type="number"
                    value={leadValue}
                    onChange={(e) => setLeadValue(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Next Follow-up</label>
                  <input
                    type="date"
                    value={nextFollowup}
                    onChange={(e) => setNextFollowup(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
                  <textarea
                    value={leadNotes}
                    onChange={(e) => setLeadNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); resetForm(); }}
                  className="px-4 py-2 text-gray-400 hover:bg-[#1a1a3a] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 gradient-accent text-white rounded-lg hover:opacity-90 transition"
                >
                  {editingLead ? 'Save Changes' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
