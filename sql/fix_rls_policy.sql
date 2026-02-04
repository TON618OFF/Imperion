-- Fix RLS policy for code_submissions table
-- This allows authenticated users to insert their own submissions

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can insert own submissions" ON code_submissions;
DROP POLICY IF EXISTS "Users can view own submissions" ON code_submissions;

-- Create policy for INSERT
CREATE POLICY "Users can insert own submissions"
ON code_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create policy for SELECT
CREATE POLICY "Users can view own submissions"
ON code_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Optional: Allow mentors and admins to view all submissions
DROP POLICY IF EXISTS "Mentors and admins can view all submissions" ON code_submissions;

CREATE POLICY "Mentors and admins can view all submissions"
ON code_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('ментор', 'администратор')
  )
);
