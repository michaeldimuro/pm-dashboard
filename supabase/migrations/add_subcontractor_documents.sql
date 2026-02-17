-- Migration: Add subcontractor documents table and storage bucket
-- Supports document uploads for sub-contractors (W9, insurance, contracts, etc.)

-- Create document type enum
CREATE TYPE subcontractor_document_type AS ENUM (
  'w9',
  'insurance',
  'contract',
  'license',
  'invoice',
  'other'
);

-- Create subcontractor_documents table
CREATE TABLE subcontractor_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id) ON DELETE CASCADE,
  document_type subcontractor_document_type NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index for fast lookups by subcontractor
CREATE INDEX idx_subcontractor_documents_subcontractor_id ON subcontractor_documents(subcontractor_id);

-- Enable RLS
ALTER TABLE subcontractor_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can CRUD
CREATE POLICY "Authenticated users can view subcontractor documents"
  ON subcontractor_documents FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert subcontractor documents"
  ON subcontractor_documents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update subcontractor documents"
  ON subcontractor_documents FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete subcontractor documents"
  ON subcontractor_documents FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for subcontractor documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-documents', 'subcontractor-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users can upload/read/delete
CREATE POLICY "Authenticated users can upload subcontractor documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'subcontractor-documents');

CREATE POLICY "Authenticated users can view subcontractor documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'subcontractor-documents');

CREATE POLICY "Authenticated users can delete subcontractor documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'subcontractor-documents');
