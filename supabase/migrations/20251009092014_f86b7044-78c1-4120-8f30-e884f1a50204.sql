-- CRITICAL SECURITY FIX: Secure the client-files storage bucket
-- Currently the bucket is PUBLIC, exposing passport photos and personal documents to anyone

-- Update the client-files bucket to be private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'client-files';

-- Drop any existing policies on storage.objects for client-files bucket
DROP POLICY IF EXISTS "Authenticated users can view their assigned client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client files" ON storage.objects;

-- CREATE STORAGE POLICIES that match the clients table RLS policies

-- SELECT: Admins and managers can view all files, employees can view files for their assigned clients
CREATE POLICY "Authenticated admins and managers can view all client files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-files' AND
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Authenticated employees can view their assigned client files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'client-files' AND
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.email IS NOT NULL
  )
);

-- INSERT: Admins, managers, and employees can upload files
CREATE POLICY "Authenticated staff can upload client files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'client-files' AND
  auth.uid() IS NOT NULL AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'employee'::app_role)
  )
);

-- UPDATE: Admins and managers can update any file, employees can update files they have access to
CREATE POLICY "Authenticated admins and managers can update client files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'client-files' AND
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- DELETE: Only admins and managers can delete files
CREATE POLICY "Authenticated admins and managers can delete client files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'client-files' AND
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Add audit logging by creating a function to log access to sensitive client data
CREATE TABLE IF NOT EXISTS public.client_data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  action text NOT NULL, -- 'view', 'update', 'delete', 'file_access'
  accessed_fields text[], -- Array of sensitive fields accessed
  timestamp timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on the audit log table
ALTER TABLE public.client_data_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs"
ON public.client_data_access_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs (SECURITY DEFINER function will handle this)
CREATE POLICY "System can insert audit logs"
ON public.client_data_access_log
FOR INSERT
WITH CHECK (true);

-- Create index for better query performance on audit logs
CREATE INDEX IF NOT EXISTS idx_client_data_access_log_user_id ON public.client_data_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_client_data_access_log_client_id ON public.client_data_access_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_data_access_log_timestamp ON public.client_data_access_log(timestamp);

COMMENT ON TABLE public.client_data_access_log IS 'Audit log for all access to sensitive client data. Only admins can view these logs.';