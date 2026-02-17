import React from 'react';
import {
  Star,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Shield,
  Award,
  Edit,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import type { Subcontractor } from '@/types/subcontractor';

interface SubcontractorCardProps {
  subcontractor: Subcontractor;
  onEdit: (sub: Subcontractor) => void;
}

export default function SubcontractorCard({ subcontractor, onEdit }: SubcontractorCardProps) {
  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'busy':
        return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'unavailable':
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
      case 'do_not_use':
        return 'text-red-400 bg-red-400/10 border-red-400/30';
      default:
        return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  const getSpecialtyIcon = (specialty: string) => {
    // Return an emoji or icon based on specialty
    const icons: { [key: string]: string } = {
      electrical: '⚡',
      plumbing: '🚰',
      HVAC: '❄️',
      carpentry: '🪚',
      drywall: '🧱',
      roofing: '🏠',
      painting: '🎨',
      flooring: '📐',
      masonry: '🧱',
      landscaping: '🌿',
      general: '🔧',
    };
    return icons[specialty] || '🔧';
  };

  const renderStarRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} size={16} className="fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <Star size={16} className="fill-yellow-400 text-yellow-400" style={{ clipPath: 'inset(0 50% 0 0)' }} />}
        {[...Array(emptyStars)].map((_, i) => (
          <Star key={`empty-${i}`} size={16} className="text-gray-600" />
        ))}
        <span className="text-sm text-gray-400 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const needsAttention = 
    (subcontractor.license_expiry && new Date(subcontractor.license_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) ||
    (subcontractor.insurance_expiry && new Date(subcontractor.insurance_expiry) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  return (
    <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg p-5 hover:border-blue-500/50 transition-all group relative">
      {/* Edit Button */}
      <button
        onClick={() => onEdit(subcontractor)}
        className="absolute top-4 right-4 p-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:border-blue-500"
      >
        <Edit size={16} className="text-gray-400" />
      </button>

      {/* Attention Badge */}
      {needsAttention && (
        <div className="absolute top-4 right-16 px-2 py-1 bg-orange-500/20 border border-orange-500/50 rounded-md flex items-center gap-1">
          <AlertCircle size={14} className="text-orange-400" />
          <span className="text-xs text-orange-400">Attention</span>
        </div>
      )}

      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">{getSpecialtyIcon(subcontractor.specialty)}</div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-white">{subcontractor.name}</h3>
            {subcontractor.company_name && (
              <p className="text-sm text-gray-400">{subcontractor.company_name}</p>
            )}
            <p className="text-xs text-purple-400 capitalize mt-1">{subcontractor.specialty}</p>
          </div>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-4">
        {renderStarRating(subcontractor.quality_rating)}
        <div className="flex items-center gap-4 mt-2 text-sm">
          <div className="flex items-center gap-1">
            <Award size={14} className="text-blue-400" />
            <span className="text-gray-400">Reliability:</span>
            <span className="text-white font-medium">{subcontractor.reliability_score}/100</span>
          </div>
          <div className="text-gray-400">
            {subcontractor.jobs_completed} jobs
          </div>
        </div>
      </div>

      {/* Availability Status */}
      <div className={`px-3 py-2 rounded-lg border mb-4 ${getAvailabilityColor(subcontractor.availability_status)}`}>
        <div className="flex items-center gap-2">
          {subcontractor.availability_status === 'available' && <CheckCircle size={16} />}
          {subcontractor.availability_status === 'busy' && <Clock size={16} />}
          {subcontractor.availability_status === 'unavailable' && <XCircle size={16} />}
          {subcontractor.availability_status === 'do_not_use' && <XCircle size={16} />}
          <span className="text-sm font-medium capitalize">
            {subcontractor.availability_status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Phone size={14} className="text-gray-400" />
          <a href={`tel:${subcontractor.phone}`} className="text-blue-400 hover:text-blue-300">
            {subcontractor.phone}
          </a>
        </div>
        {subcontractor.email && (
          <div className="flex items-center gap-2 text-sm">
            <Mail size={14} className="text-gray-400" />
            <a href={`mailto:${subcontractor.email}`} className="text-blue-400 hover:text-blue-300">
              {subcontractor.email}
            </a>
          </div>
        )}
        {subcontractor.city && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-gray-400" />
            <span className="text-gray-300">
              {subcontractor.city}{subcontractor.state ? `, ${subcontractor.state}` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Rates */}
      {subcontractor.hourly_rate && (
        <div className="flex items-center gap-2 mb-4 text-sm">
          <DollarSign size={14} className="text-green-400" />
          <span className="text-gray-400">Hourly Rate:</span>
          <span className="text-white font-medium">${subcontractor.hourly_rate}/hr</span>
        </div>
      )}

      {/* Certifications */}
      <div className="flex items-center gap-3 mb-4">
        {subcontractor.licensed && (
          <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-xs text-blue-400">
            <Shield size={12} />
            Licensed
          </div>
        )}
        {subcontractor.insured && (
          <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-400">
            <Shield size={12} />
            Insured
          </div>
        )}
        {subcontractor.bonded && (
          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/20 border border-purple-500/50 rounded text-xs text-purple-400">
            <Shield size={12} />
            Bonded
          </div>
        )}
      </div>

      {/* Tags */}
      {subcontractor.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {subcontractor.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-[#0f0f23] border border-[#2a2a4a] rounded text-xs text-gray-300"
            >
              {tag}
            </span>
          ))}
          {subcontractor.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-400">
              +{subcontractor.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Notes Preview */}
      {subcontractor.notes && (
        <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
          <p className="text-sm text-gray-400 line-clamp-2">{subcontractor.notes}</p>
        </div>
      )}
    </div>
  );
}
