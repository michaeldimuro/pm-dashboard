import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Trash2, Upload, FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Subcontractor, SubcontractorDocument, SubcontractorDocumentType } from '@/types/subcontractor';

interface SubcontractorModalProps {
  subcontractor: Subcontractor | null;
  onClose: () => void;
}

export default function SubcontractorModal({ subcontractor, onClose }: SubcontractorModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    specialty: 'general',
    phone: '',
    email: '',
    hourly_rate: '',
    daily_rate: '',
    quality_rating: '3.0',
    reliability_score: '50',
    availability_status: 'available',
    licensed: false,
    license_number: '',
    insured: false,
    bonded: false,
    notes: '',
    strengths: '',
    weaknesses: '',
    skills: '',
    tags: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    payment_terms: '',
  });

  // Document upload state
  const [documents, setDocuments] = useState<SubcontractorDocument[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [documentType, setDocumentType] = useState<SubcontractorDocumentType>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTypeLabels: Record<SubcontractorDocumentType, string> = {
    w9: 'W-9',
    insurance: 'Insurance',
    contract: 'Contract',
    license: 'License',
    invoice: 'Invoice',
    other: 'Other',
  };

  // Load existing documents when editing
  useEffect(() => {
    if (subcontractor) {
      const loadDocuments = async () => {
        const { data, error } = await supabase
          .from('subcontractor_documents')
          .select('*')
          .eq('subcontractor_id', subcontractor.id)
          .order('uploaded_at', { ascending: false });

        if (!error && data) {
          setDocuments(data);
        }
      };
      loadDocuments();
    }
  }, [subcontractor]);

  const handleFileUpload = async (files: FileList) => {
    if (!subcontractor) {
      alert('Please save the sub-contractor first before uploading documents.');
      return;
    }

    setUploadingFiles(true);
    try {
      for (const file of Array.from(files)) {
        const filePath = `${subcontractor.id}/${documentType}/${file.name}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('subcontractor-documents')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          alert(`Failed to upload ${file.name}: ${uploadError.message}`);
          continue;
        }

        // Save metadata to subcontractor_documents table
        const { data: docData, error: dbError } = await supabase
          .from('subcontractor_documents')
          .insert({
            subcontractor_id: subcontractor.id,
            document_type: documentType,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            uploaded_by_user_id: user?.id || null,
          })
          .select()
          .single();

        if (dbError) {
          console.error('DB error:', dbError);
          alert(`Failed to save metadata for ${file.name}: ${dbError.message}`);
          continue;
        }

        if (docData) {
          setDocuments((prev) => [docData, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteDocument = async (doc: SubcontractorDocument) => {
    if (!confirm(`Delete "${doc.file_name}"?`)) return;

    try {
      // Delete from storage
      await supabase.storage
        .from('subcontractor-documents')
        .remove([doc.file_path]);

      // Delete metadata
      const { error } = await supabase
        .from('subcontractor_documents')
        .delete()
        .eq('id', doc.id);

      if (error) throw error;

      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  useEffect(() => {
    if (subcontractor) {
      setFormData({
        name: subcontractor.name,
        company_name: subcontractor.company_name || '',
        specialty: subcontractor.specialty,
        phone: subcontractor.phone,
        email: subcontractor.email || '',
        hourly_rate: subcontractor.hourly_rate?.toString() || '',
        daily_rate: subcontractor.daily_rate?.toString() || '',
        quality_rating: subcontractor.quality_rating.toString(),
        reliability_score: subcontractor.reliability_score.toString(),
        availability_status: subcontractor.availability_status,
        licensed: subcontractor.licensed,
        license_number: subcontractor.license_number || '',
        insured: subcontractor.insured,
        bonded: subcontractor.bonded,
        notes: subcontractor.notes || '',
        strengths: subcontractor.strengths || '',
        weaknesses: subcontractor.weaknesses || '',
        skills: subcontractor.skills.join(', '),
        tags: subcontractor.tags.join(', '),
        address: subcontractor.address || '',
        city: subcontractor.city || '',
        state: subcontractor.state || '',
        zip_code: subcontractor.zip_code || '',
        payment_terms: subcontractor.payment_terms || '',
      });
    }
  }, [subcontractor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data: any = {
        name: formData.name,
        company_name: formData.company_name || null,
        specialty: formData.specialty,
        phone: formData.phone,
        email: formData.email || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : null,
        quality_rating: parseFloat(formData.quality_rating),
        reliability_score: parseInt(formData.reliability_score),
        availability_status: formData.availability_status,
        licensed: formData.licensed,
        license_number: formData.license_number || null,
        insured: formData.insured,
        bonded: formData.bonded,
        notes: formData.notes || null,
        strengths: formData.strengths || null,
        weaknesses: formData.weaknesses || null,
        skills: formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : [],
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        zip_code: formData.zip_code || null,
        payment_terms: formData.payment_terms || null,
      };

      if (subcontractor) {
        // Update existing
        const { error } = await supabase
          .from('subcontractors')
          .update(data)
          .eq('id', subcontractor.id);

        if (error) throw error;
      } else {
        // Create new
        data.created_by_user_id = user?.id || null;
        const { error } = await supabase
          .from('subcontractors')
          .insert([data]);

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      alert('Failed to save subcontractor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!subcontractor) return;
    if (!confirm('Are you sure you want to archive this sub-contractor?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('subcontractors')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_reason: 'Archived via dashboard',
        })
        .eq('id', subcontractor.id);

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error archiving subcontractor:', error);
      alert('Failed to archive subcontractor. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#1a1a3a] border border-[#2a2a4a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a3a] border-b border-[#2a2a4a] p-6 flex items-center justify-between z-10">
          <h2 className="text-2xl font-bold text-white">
            {subcontractor ? 'Edit Sub-Contractor' : 'Add New Sub-Contractor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#2a2a4a] rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Specialty *</label>
                <select
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="HVAC">HVAC</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="drywall">Drywall</option>
                  <option value="roofing">Roofing</option>
                  <option value="painting">Painting</option>
                  <option value="flooring">Flooring</option>
                  <option value="masonry">Masonry</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Availability *</label>
                <select
                  required
                  value={formData.availability_status}
                  onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500 capitalize"
                >
                  <option value="available">Available</option>
                  <option value="busy">Busy</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="do_not_use">Do Not Use</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-400 mb-2">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">State</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Financial */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Rates & Payment</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Hourly Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.hourly_rate}
                  onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Daily Rate ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.daily_rate}
                  onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Payment Terms</label>
                <input
                  type="text"
                  placeholder="e.g., Net 30"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quality Rating (1.0 - 5.0)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={formData.quality_rating}
                  onChange={(e) => setFormData({ ...formData, quality_rating: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Reliability Score (0 - 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.reliability_score}
                  onChange={(e) => setFormData({ ...formData, reliability_score: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Certifications</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.licensed}
                    onChange={(e) => setFormData({ ...formData, licensed: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white">Licensed</span>
                </label>
                {formData.licensed && (
                  <input
                    type="text"
                    placeholder="License Number"
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                    className="flex-1 px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                )}
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.insured}
                  onChange={(e) => setFormData({ ...formData, insured: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white">Insured</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.bonded}
                  onChange={(e) => setFormData({ ...formData, bonded: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-white">Bonded</span>
              </label>
            </div>
          </div>

          {/* Skills & Tags */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Skills & Tags</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., wiring, panel installation, troubleshooting"
                  value={formData.skills}
                  onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., reliable, fast, detail-oriented"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Notes & Assessment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">General Notes</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Strengths</label>
                  <textarea
                    rows={2}
                    value={formData.strengths}
                    onChange={(e) => setFormData({ ...formData, strengths: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Weaknesses</label>
                  <textarea
                    rows={2}
                    value={formData.weaknesses}
                    onChange={(e) => setFormData({ ...formData, weaknesses: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          {subcontractor && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Documents</h3>

              {/* Upload Controls */}
              <div className="flex flex-wrap items-end gap-3 mb-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Document Type</label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as SubcontractorDocumentType)}
                    className="px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    {Object.entries(documentTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="doc-upload"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFiles}
                    className="flex items-center gap-2 px-4 py-2 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg text-white hover:border-blue-500 transition-colors disabled:opacity-50"
                  >
                    {uploadingFiles ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )}
                    {uploadingFiles ? 'Uploading...' : 'Upload Files'}
                  </button>
                </div>
              </div>

              {/* Document List */}
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3 bg-[#0f0f23] border border-[#2a2a4a] rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText size={18} className="text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{doc.file_name}</p>
                          <p className="text-xs text-gray-400">
                            {documentTypeLabels[doc.document_type]} &middot; {formatFileSize(doc.file_size)} &middot; {new Date(doc.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const { data } = await supabase.storage
                              .from('subcontractor-documents')
                              .createSignedUrl(doc.file_path, 60);
                            if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                          }}
                          className="px-3 py-1 text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded hover:border-blue-500 transition-colors"
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No documents uploaded yet.</p>
              )}
            </div>
          )}

          {!subcontractor && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Documents</h3>
              <p className="text-sm text-gray-400">Save the sub-contractor first, then edit to upload documents.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-[#2a2a4a]">
            <div>
              {subcontractor && (
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Archive
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-6 py-2 bg-[#2a2a4a] rounded-lg text-white hover:bg-[#3a3a5a] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white hover:from-blue-600 hover:to-purple-600 transition-all disabled:opacity-50"
              >
                <Save size={16} />
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
