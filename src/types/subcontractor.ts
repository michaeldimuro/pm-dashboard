export interface Subcontractor {
  id: string;
  name: string;
  company_name?: string | null;
  specialty: 'electrical' | 'plumbing' | 'HVAC' | 'carpentry' | 'drywall' | 'roofing' | 'painting' | 'flooring' | 'masonry' | 'landscaping' | 'general';
  
  // Contact
  email?: string | null;
  phone: string;
  secondary_phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  
  // Financial
  hourly_rate?: number | null;
  daily_rate?: number | null;
  payment_terms?: string | null;
  
  // Performance
  quality_rating: number; // 1.0 - 5.0
  reliability_score: number; // 0 - 100
  jobs_completed: number;
  
  // Availability
  availability_status: 'available' | 'busy' | 'unavailable' | 'do_not_use';
  next_available_date?: string | null;
  
  // Certifications
  licensed: boolean;
  license_number?: string | null;
  license_expiry?: string | null;
  insured: boolean;
  insurance_expiry?: string | null;
  bonded: boolean;
  
  // Skills
  skills: string[];
  has_own_tools: boolean;
  has_transportation: boolean;
  
  // Vetting
  background_check_completed: boolean;
  background_check_date?: string | null;
  reference_check_completed: boolean;
  
  // Notes
  notes?: string | null;
  strengths?: string | null;
  weaknesses?: string | null;
  internal_comments?: string | null;
  
  // Project history
  projects_worked_on: string[];
  last_project_date?: string | null;
  
  // Metadata
  created_at: string;
  updated_at: string;
  created_by_user_id?: string | null;
  archived: boolean;
  archived_at?: string | null;
  archived_reason?: string | null;
  
  // Tags
  tags: string[];
}

export interface SubcontractorReview {
  id: string;
  subcontractor_id: string;
  project_id?: string | null;
  
  rating: number; // 1.0 - 5.0
  quality_rating?: number | null; // 1-5
  timeliness_rating?: number | null; // 1-5
  professionalism_rating?: number | null; // 1-5
  communication_rating?: number | null; // 1-5
  
  review_text?: string | null;
  would_hire_again: boolean;
  
  reviewed_by_user_id?: string | null;
  created_at: string;
  
  job_description?: string | null;
  job_date?: string | null;
  job_cost?: number | null;
}

export type SubcontractorDocumentType = 'w9' | 'insurance' | 'contract' | 'license' | 'invoice' | 'other';

export interface SubcontractorDocument {
  id: string;
  subcontractor_id: string;
  document_type: SubcontractorDocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by_user_id?: string | null;
}

export type SubcontractorSpecialty = Subcontractor['specialty'];
export type SubcontractorAvailability = Subcontractor['availability_status'];
