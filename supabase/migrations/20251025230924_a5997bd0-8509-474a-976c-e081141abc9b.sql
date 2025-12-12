-- Function to sync employee when role is assigned
CREATE OR REPLACE FUNCTION public.sync_employee_on_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_employee_name TEXT;
BEGIN
  -- Only process if role is 'employee'
  IF (TG_OP = 'INSERT' AND NEW.role = 'employee') THEN
    -- Get profile information
    SELECT * INTO v_profile
    FROM public.profiles
    WHERE id = NEW.user_id;
    
    IF v_profile IS NOT NULL THEN
      v_employee_name := TRIM(v_profile.first_name || ' ' || v_profile.last_name);
      
      -- Insert or update employee record
      INSERT INTO public.employees (user_id, name, email, workload, profile_synced)
      VALUES (
        NEW.user_id,
        v_employee_name,
        v_profile.email,
        0,
        true
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        profile_synced = true,
        updated_at = now();
    END IF;
  ELSIF (TG_OP = 'DELETE' AND OLD.role = 'employee') THEN
    -- Remove from employees table when employee role is removed
    DELETE FROM public.employees WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS sync_employee_on_role_change_trigger ON public.user_roles;
CREATE TRIGGER sync_employee_on_role_change_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_employee_on_role_change();

-- Add unique constraint on user_id to prevent duplicates
ALTER TABLE public.employees 
  DROP CONSTRAINT IF EXISTS employees_user_id_key;
  
ALTER TABLE public.employees 
  ADD CONSTRAINT employees_user_id_key UNIQUE (user_id);

-- Sync existing employees from user_roles
INSERT INTO public.employees (user_id, name, email, workload, profile_synced)
SELECT 
  p.id,
  TRIM(p.first_name || ' ' || p.last_name) as name,
  p.email,
  (SELECT COUNT(*) FROM clients WHERE assigned_employee = TRIM(p.first_name || ' ' || p.last_name) OR assigned_employee = p.email),
  true
FROM public.profiles p
INNER JOIN public.user_roles ur ON p.id = ur.user_id
WHERE ur.role = 'employee'
ON CONFLICT (user_id) 
DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  profile_synced = true,
  updated_at = now();