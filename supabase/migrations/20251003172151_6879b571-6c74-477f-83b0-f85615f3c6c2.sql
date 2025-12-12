-- Drop existing policies for client-files bucket
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete files" ON storage.objects;

-- Create new policies with proper naming and checks
CREATE POLICY "client_files_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "client_files_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "client_files_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files')
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "client_files_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');