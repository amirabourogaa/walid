-- Add visa date fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS visa_start_date date,
ADD COLUMN IF NOT EXISTS visa_end_date date;

-- Create RLS policies for client-files storage bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can view files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-files')
WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-files');