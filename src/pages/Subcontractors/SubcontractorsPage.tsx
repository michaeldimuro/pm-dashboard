import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Star, Phone, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import SubcontractorCard from '@/components/Subcontractors/SubcontractorCard';
import SubcontractorModal from '@/components/Subcontractors/SubcontractorModal';
import type { Subcontractor } from '@/types/subcontractor';

export default function SubcontractorsPage() {
  const { user } = useAuth();
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubs, setFilteredSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterAvailability, setFilterAvailability] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<Subcontractor | null>(null);

  const specialties = [
    'all', 'electrical', 'plumbing', 'HVAC', 'carpentry', 'drywall',
    'roofing', 'painting', 'flooring', 'masonry', 'landscaping', 'general'
  ];

  const availabilityOptions = [
    'all', 'available', 'busy', 'unavailable'
  ];

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [subcontractors, searchQuery, filterSpecialty, filterAvailability]);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('subcontractors')
        .select('*')
        .eq('archived', false)
        .order('quality_rating', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...subcontractors];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub =>
        sub.name.toLowerCase().includes(query) ||
        sub.company_name?.toLowerCase().includes(query) ||
        sub.specialty.toLowerCase().includes(query)
      );
    }

    // Specialty filter
    if (filterSpecialty !== 'all') {
      filtered = filtered.filter(sub => sub.specialty === filterSpecialty);
    }

    // Availability filter
    if (filterAvailability !== 'all') {
      filtered = filtered.filter(sub => sub.availability_status === filterAvailability);
    }

    setFilteredSubs(filtered);
  };

  const handleAddNew = () => {
    setSelectedSub(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sub: Subcontractor) => {
    setSelectedSub(sub);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedSub(null);
    fetchSubcontractors(); // Refresh list
  };

  const getStats = () => {
    return {
      total: subcontractors.length,
      available: subcontractors.filter(s => s.availability_status === 'available').length,
      topRated: subcontractors.filter(s => s.quality_rating >= 4.5).length,
      needsAttention: subcontractors.filter(s => 
        (s.license_expiry && new Date(s.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) ||
        (s.insurance_expiry && new Date(s.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      ).length,
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-white text-xl">Loading subcontractors...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Sub-Contractors
            </h1>
            <p className="text-gray-400 mt-2">Manage your trusted network of trade professionals</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all"
          >
            <Plus size={20} />
            Add Contractor
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-4">
            <div className="text-gray-400 text-sm">Total Contractors</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-4">
            <div className="text-gray-400 text-sm">Available Now</div>
            <div className="text-3xl font-bold text-green-400 mt-1">{stats.available}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-4">
            <div className="text-gray-400 text-sm">Top Rated (4.5+)</div>
            <div className="text-3xl font-bold text-yellow-400 mt-1">{stats.topRated}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-4">
            <div className="text-gray-400 text-sm flex items-center gap-1">
              <AlertCircle size={14} />
              Needs Attention
            </div>
            <div className="text-3xl font-bold text-orange-400 mt-1">{stats.needsAttention}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Search */}
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, company, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Specialty Filter */}
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                {specialties.map(spec => (
                  <option key={spec} value={spec} className="capitalize">
                    {spec === 'all' ? 'All Specialties' : spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <select
                value={filterAvailability}
                onChange={(e) => setFilterAvailability(e.target.value)}
                className="px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                {availabilityOptions.map(status => (
                  <option key={status} value={status} className="capitalize">
                    {status === 'all' ? 'All Status' : status}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Contractors Grid */}
      <div className="max-w-7xl mx-auto">
        {filteredSubs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg">
              {searchQuery || filterSpecialty !== 'all' || filterAvailability !== 'all'
                ? 'No contractors match your filters'
                : 'No contractors yet. Add your first one!'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubs.map(sub => (
              <SubcontractorCard
                key={sub.id}
                subcontractor={sub}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SubcontractorModal
          subcontractor={selectedSub}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}
