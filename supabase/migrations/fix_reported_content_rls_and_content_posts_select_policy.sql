/*
  # Fix RLS policies for reported_content and content_posts
  1. Remove redundant INSERT policies for reported_content.
  2. Add a more permissive SELECT policy for content_posts to ensure foreign key checks pass.
*/

-- Remove redundant INSERT policies for reported_content
DROP POLICY IF EXISTS "Users can report content" ON public.reported_content;
DROP POLICY IF EXISTS "Authenticated users can report content" ON public.reported_content;

-- Add a more permissive SELECT policy for content_posts to ensure foreign key checks pass
-- This policy will allow authenticated users to see all approved content,
-- which is crucial for foreign key validation when liking content.
CREATE POLICY "Allow authenticated to select all approved content for FK checks"
ON public.content_posts
FOR SELECT TO authenticated
USING (status = 'approved');

-- Ensure the existing "Allow authenticated users to insert their own likes" policy on content_likes is active and correct.
-- (No change needed here, just a reminder that this policy is critical for liking)
-- ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow authenticated users to insert their own likes" ON content_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());