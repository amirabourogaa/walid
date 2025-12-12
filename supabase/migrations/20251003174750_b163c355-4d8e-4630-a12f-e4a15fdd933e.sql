-- Drop existing policies that require authenticated users
DROP POLICY IF EXISTS "Authenticated users can upload to client-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view client-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client-files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client-files" ON storage.objects;

-- Create policies that allow anon users (temporary solution for mock auth)
-- WARNING: In production, you should implement proper Supabase Auth instead
CREATE POLICY "Allow anon upload to client-files"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Allow anon view client-files"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'client-files');

CREATE POLICY "Allow anon update client-files"
ON storage.objects
FOR UPDATE
TO anon
USING (bucket_id = 'client-files');

CREATE POLICY "Allow anon delete client-files"
ON storage.objects
FOR DELETE
TO anon
USING (bucket_id = 'client-files');