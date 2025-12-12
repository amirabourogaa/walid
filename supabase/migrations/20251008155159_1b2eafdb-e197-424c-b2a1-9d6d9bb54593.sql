-- Make the client-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'client-files';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client files" ON storage.objects;

-- Create RLS policies for client-files bucket
CREATE POLICY "Public can view client files"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can upload client files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update client files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files')
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');