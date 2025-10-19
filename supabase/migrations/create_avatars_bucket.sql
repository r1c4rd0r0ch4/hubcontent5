/*
  # Create avatars bucket
  1. New Storage Bucket: avatars (public)
  2. Security: Enable RLS for avatars bucket, add policies for authenticated users to upload/update their own avatars and for all users to view them.
*/

-- Create the 'avatars' storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true) -- Avatars are typically public
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security for the 'avatars' bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload/update their own avatars
CREATE POLICY "Allow authenticated users to upload/update their own avatars"
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Allow authenticated users to update their own avatars"
ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy for all users to view avatars (since they are public)
CREATE POLICY "Allow all users to view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy for authenticated users to delete their own avatars (if needed)
CREATE POLICY "Allow authenticated users to delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);