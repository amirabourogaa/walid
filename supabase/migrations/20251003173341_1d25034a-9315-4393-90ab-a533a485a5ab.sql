-- Drop all existing policies for client-files bucket to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;
DROP POLICY IF EXISTS "client_files_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "client_files_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "client_files_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "client_files_delete_policy" ON storage.objects;

-- Ensure the bucket exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-files',
  'client-files',
  false,
  524288000, -- 500MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[]
)
ON CONFLICT (id) 
DO UPDATE SET 
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']::text[];

-- Create simple, permissive policies for authenticated users
CREATE POLICY "Authenticated users can upload to client-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can view client-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update client-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client-files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');