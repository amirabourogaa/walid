-- CRITICAL FIX: Block all anonymous access to sensitive clients table
-- All existing policies already check roles, but we need to ensure authentication is required

-- Drop all existing policies to rebuild them with explicit auth checks
DROP POLICY IF EXISTS "Admins and managers can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins and managers can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can insert clients assigned to them" ON public.clients;
DROP POLICY IF EXISTS "Admins and managers can update all clients" ON public.clients;
DROP POLICY IF EXISTS "Employees can update their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins and managers can delete clients" ON public.clients;

-- CREATE NEW POLICIES WITH EXPLICIT AUTHENTICATION REQUIREMENTS

-- SELECT policies: Require authentication FIRST, then check roles
CREATE POLICY "Authenticated admins and managers can view all clients"
ON public.clients
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Authenticated employees can view their assigned clients"
ON public.clients
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      clients.assigned_employee = profiles.email
      OR clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR clients.assigned_employee = profiles.first_name
    )
  )
);

-- INSERT policies: Require authentication FIRST
CREATE POLICY "Authenticated admins and managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Authenticated employees can insert clients assigned to them"
ON public.clients
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      clients.assigned_employee = profiles.email
      OR clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR clients.assigned_employee = profiles.first_name
    )
  )
);

-- UPDATE policies: Require authentication FIRST
CREATE POLICY "Authenticated admins and managers can update all clients"
ON public.clients
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

CREATE POLICY "Authenticated employees can update their assigned clients"
ON public.clients
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      clients.assigned_employee = profiles.email
      OR clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR clients.assigned_employee = profiles.first_name
    )
  )
);

-- DELETE policies: Require authentication FIRST
CREATE POLICY "Authenticated admins and managers can delete clients"
ON public.clients
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))
);

-- Add comment to document security requirements
COMMENT ON TABLE public.clients IS 'Contains highly sensitive PII including passport numbers and personal photos. All access requires authentication and role-based authorization.';