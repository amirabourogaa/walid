-- Fix employee access control vulnerability
-- This migration addresses the security issue where employees could manipulate their profile
-- data to gain unauthorized access to other employees' clients

-- Step 1: Add assigned_employee_id column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_employee_id UUID REFERENCES public.employees(user_id);

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_clients_assigned_employee_id ON public.clients(assigned_employee_id);

-- Step 3: Migrate existing data from assigned_employee (text) to assigned_employee_id (UUID)
UPDATE public.clients c
SET assigned_employee_id = e.user_id
FROM public.employees e
WHERE c.assigned_employee_id IS NULL
  AND (
    c.assigned_employee = e.email 
    OR c.assigned_employee = e.name
    OR c.assigned_employee = TRIM(e.name)
  );

-- Step 4: Drop old employee access RLS policies
DROP POLICY IF EXISTS "Authenticated employees can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated employees can update their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated employees can insert clients assigned to them" ON public.clients;
DROP POLICY IF EXISTS "Employees can view logs of their assigned clients" ON public.client_activity_log;

-- Step 5: Create new secure RLS policies using assigned_employee_id
CREATE POLICY "Employees can view their assigned clients"
  ON public.clients FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    has_role(auth.uid(), 'employee'::app_role) AND
    assigned_employee_id = auth.uid()
  );

CREATE POLICY "Employees can update their assigned clients"
  ON public.clients FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    has_role(auth.uid(), 'employee'::app_role) AND
    assigned_employee_id = auth.uid()
  );

CREATE POLICY "Employees can insert clients assigned to them"
  ON public.clients FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    has_role(auth.uid(), 'employee'::app_role) AND
    assigned_employee_id = auth.uid()
  );

CREATE POLICY "Employees can view logs for their assigned clients"
  ON public.client_activity_log FOR SELECT
  USING (
    has_role(auth.uid(), 'employee'::app_role) AND
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_activity_log.client_id
        AND c.assigned_employee_id = auth.uid()
    )
  );

-- Step 6: Drop overly permissive profile update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Step 7: Create restricted profile update policy (only phone and department)
CREATE POLICY "Users can update non-security-critical fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent changing email, first_name, last_name
    email = (SELECT email FROM public.profiles WHERE id = auth.uid()) AND
    first_name = (SELECT first_name FROM public.profiles WHERE id = auth.uid()) AND
    last_name = (SELECT last_name FROM public.profiles WHERE id = auth.uid())
  );

-- Step 8: Allow admins to update all profile fields
CREATE POLICY "Admins can update all profile fields"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Step 9: Create validation trigger for assigned_employee_id
CREATE OR REPLACE FUNCTION public.validate_assigned_employee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.assigned_employee_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.employees WHERE user_id = NEW.assigned_employee_id
    ) THEN
      RAISE EXCEPTION 'Invalid employee assignment: Employee does not exist';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_client_employee_assignment
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.validate_assigned_employee();

-- Step 10: Update existing triggers to use assigned_employee_id
CREATE OR REPLACE FUNCTION public.notify_employee_on_client_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  -- Only proceed if assigned_employee_id is set
  IF NEW.assigned_employee_id IS NOT NULL THEN
    v_client_name := NEW.full_name;
    
    -- Create notification
    INSERT INTO public.employee_notifications (
      employee_id,
      client_id,
      notification_type,
      title,
      message
    )
    SELECT
      e.id,
      NEW.id,
      'new_client_assignment',
      'عميل جديد',
      'تم تعيين عميل جديد لك: ' || v_client_name
    FROM public.employees e
    WHERE e.user_id = NEW.assigned_employee_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_employee_on_client_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
BEGIN
  -- Only notify if assigned_employee_id changed
  IF OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id 
     AND NEW.assigned_employee_id IS NOT NULL THEN
    v_client_name := NEW.full_name;
    
    -- Create notification
    INSERT INTO public.employee_notifications (
      employee_id,
      client_id,
      notification_type,
      title,
      message
    )
    SELECT
      e.id,
      NEW.id,
      'client_reassignment',
      'عميل معاد تعيينه',
      'تم تعيين عميل لك: ' || v_client_name
    FROM public.employees e
    WHERE e.user_id = NEW.assigned_employee_id;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.clients.assigned_employee_id IS 'UUID reference to employees.user_id - more secure than text matching';
COMMENT ON COLUMN public.clients.assigned_employee IS 'DEPRECATED: Use assigned_employee_id instead. Kept for backward compatibility.';