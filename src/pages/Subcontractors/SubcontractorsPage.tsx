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
    <div className="min-h-screen bg-[#0a0a1a] text-white p-4 sm:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
              Sub-Contractors
            </h1>
            <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">Manage your trusted network of trade professionals</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all touch-manipulation min-h-[44px]"
          >
            <Plus size={20} />
            <span className="font-medium">Add Contractor</span>
          </button>
        </div>

        {/* Stats Cards - Mobile: 2x2, Tablet+: 4 columns */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-3 sm:p-4">
            <div className="text-gray-400 text-xs sm:text-sm">Total Contractors</div>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-3 sm:p-4">
            <div className="text-gray-400 text-xs sm:text-sm">Available Now</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-400 mt-1">{stats.available}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-3 sm:p-4">
            <div className="text-gray-400 text-xs sm:text-sm">Top Rated (4.5+)</div>
            <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mt-1">{stats.topRated}</div>
          </div>
          <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-3 sm:p-4">
            <div className="text-gray-400 text-xs sm:text-sm flex items-center gap-1">
              <AlertCircle size={12} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Needs Attention</span>
              <span className="sm:hidden">Alerts</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-orange-400 mt-1">{stats.needsAttention}</div>
          </div>
        </div>

        {/* Filters - Stack on mobile */}
        <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-3 sm:p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            {/* Search - Full width on mobile */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <input
                type="text"
                placeholder="Search contractors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 text-base touch-manipulation"
              />
            </div>

            {/* Filters row on mobile */}
            <div className="flex gap-2 sm:gap-3">
              {/* Specialty Filter */}
              <div className="flex-1 sm:flex-none flex items-center gap-2">
                <Filter size={18} className="text-gray-400 hidden sm:block" />
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-3 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize text-sm sm:text-base touch-manipulation"
                >
                  {specialties.map(spec => (
                    <option key={spec} value={spec} className="capitalize">
                      {spec === 'all' ? 'All Specialties' : spec}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex-1 sm:flex-none">
                <select
                  value={filterAvailability}
                  onChange={(e) => setFilterAvailability(e.target.value)}
                  className="w-full sm:w-auto px-3 sm:px-4 py-3 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize text-sm sm:text-base touch-manipulation"
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
      </div>

      {/* Contractors Grid - Single column mobile, 2 cols tablet, 3 cols desktop */}
      <div className="max-w-7xl mx-auto">
        {filteredSubs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="text-gray-400 text-base sm:text-lg">
              {searchQuery || filterSpecialty !== 'all' || filterAvailability !== 'all'
                ? 'No contractors match your filters'
                : 'No contractors yet. Add your first one!'}
            </div>
            {!searchQuery && filterSpecialty === 'all' && filterAvailability === 'all' && (
              <button
                onClick={handleAddNew}
                className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all touch-manipulation inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Add Your First Contractor
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
