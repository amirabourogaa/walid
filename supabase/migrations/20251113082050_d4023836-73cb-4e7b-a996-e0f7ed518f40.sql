-- Fix critical storage security issues
-- 1. Make client-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'client-files';

-- 2. Drop all existing conflicting policies
DROP POLICY IF EXISTS "Auth upload client-files" ON storage.objects;
DROP POLICY IF EXISTS "Auth view client-files" ON storage.objects;
DROP POLICY IF EXISTS "Auth update client-files" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete client-files" ON storage.objects;
DROP POLICY IF EXISTS "Public can view client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update client files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete client files" ON storage.objects;

-- 3. Create security definer function to check if user is admin or manager
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_admin_or_manager.user_id
      AND user_roles.role IN ('admin', 'manager')
  );
$$;

-- 4. Create security definer function to check if user is employee
CREATE OR REPLACE FUNCTION public.is_employee(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = is_employee.user_id
      AND user_roles.role = 'employee'
  );
$$;

-- 5. Create clear, role-based storage policies
-- Admins and managers: full access
CREATE POLICY "Admins and managers can view all client files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-files' 
  AND public.is_admin_or_manager(auth.uid())
);

CREATE POLICY "Admins and managers can upload client files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-files' 
  AND public.is_admin_or_manager(auth.uid())
);

CREATE POLICY "Admins and managers can update client files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-files' 
  AND public.is_admin_or_manager(auth.uid())
);

CREATE POLICY "Admins and managers can delete client files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-files' 
  AND public.is_admin_or_manager(auth.uid())
);

-- Employees: read-only access
CREATE POLICY "Employees can view client files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-files' 
  AND public.is_employee(auth.uid())
);