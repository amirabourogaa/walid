-- Fix critical security issue: Restrict employee access to only their assigned clients

-- Drop existing overly permissive policies on clients table
DROP POLICY IF EXISTS "Managers can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can update clients" ON public.clients;
DROP POLICY IF EXISTS "Managers can delete clients" ON public.clients;

-- Create new granular SELECT policies
-- Admins and managers can view all clients
CREATE POLICY "Admins and managers can view all clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Employees can only view clients assigned to them
CREATE POLICY "Employees can view their assigned clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- Match by email
      clients.assigned_employee = profiles.email
      OR
      -- Match by full name (first_name last_name)
      clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR
      -- Match by first name only (fallback)
      clients.assigned_employee = profiles.first_name
    )
  )
);

-- Create new INSERT policies
CREATE POLICY "Admins and managers can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Employees can insert clients but only if assigned to themselves
CREATE POLICY "Employees can insert clients assigned to them"
ON public.clients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      clients.assigned_employee = profiles.email
      OR
      clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR
      clients.assigned_employee = profiles.first_name
    )
  )
);

-- Create new UPDATE policies
CREATE POLICY "Admins and managers can update all clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Employees can only update their assigned clients
CREATE POLICY "Employees can update their assigned clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      clients.assigned_employee = profiles.email
      OR
      clients.assigned_employee = (profiles.first_name || ' ' || profiles.last_name)
      OR
      clients.assigned_employee = profiles.first_name
    )
  )
);

-- Create new DELETE policies
CREATE POLICY "Admins and managers can delete clients"
ON public.clients
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Employees cannot delete clients (no policy = no access)