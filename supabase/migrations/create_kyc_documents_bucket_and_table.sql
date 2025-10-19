/*
  # Create kyc_documents bucket and table
  1. New Storage Bucket: kyc-documents (private)
  2. New Table: kyc_documents (id uuid, user_id uuid, document_type text, file_url text, file_path text, status text, rejection_reason text, uploaded_at timestamptz)
  3. Security: Enable RLS for kyc_documents table and bucket, add policies for authenticated users to insert/select their own documents.
*/

-- Create the 'kyc-documents' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security for the 'kyc-documents' bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload their own KYC documents
CREATE POLICY "Allow authenticated users to upload KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for authenticated users to view their own KYC documents
CREATE POLICY "Allow authenticated users to view their own KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for authenticated users to update their own KYC documents (e.g., re-upload)
CREATE POLICY "Allow authenticated users to update their own KYC documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for authenticated users to delete their own KYC documents (if needed)
CREATE POLICY "Allow authenticated users to delete their own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);


-- Create the kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL, -- e.g., 'id_front', 'id_back', 'proof_of_address', 'selfie_with_id'
  file_url text NOT NULL,
  file_path text NOT NULL,
  status text DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected'
  rejection_reason text,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_user_document_type_latest UNIQUE (user_id, document_type, uploaded_at) -- Ensure uniqueness for latest submission
);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON public.kyc_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON public.kyc_documents (document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents (status);

-- Enable Row Level Security for kyc_documents table
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to insert their own KYC document records
CREATE POLICY "Allow authenticated users to insert their own kyc_documents"
ON public.kyc_documents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to select their own KYC document records
CREATE POLICY "Allow authenticated users to select their own kyc_documents"
ON public.kyc_documents FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Policy for authenticated users to update their own KYC document records (e.g., if status changes)
CREATE POLICY "Allow authenticated users to update their own kyc_documents"
ON public.kyc_documents FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Policy for admin to view all KYC documents (assuming 'service_role' or similar for admin)
-- This policy should be carefully managed based on your admin role setup.
-- For simplicity, we'll assume an admin can bypass RLS for now, or you'd define a specific 'admin' role.
-- For now, we'll keep it restricted to user's own data.