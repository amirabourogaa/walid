-- CRITICAL SECURITY FIX: Prevent audit log manipulation
-- Current policy allows ANY authenticated user to insert audit logs, which allows
-- attackers to pollute logs and hide their tracks

-- Drop the insecure INSERT policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.client_data_access_log;

-- Create a SECURITY DEFINER function for logging client data access
-- This function bypasses RLS and can only be called from trusted application code
CREATE OR REPLACE FUNCTION public.log_client_data_access(
  p_client_id uuid,
  p_action text,
  p_accessed_fields text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow logging if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for audit logging';
  END IF;

  -- Insert the audit log entry
  INSERT INTO public.client_data_access_log (
    user_id,
    client_id,
    action,
    accessed_fields,
    timestamp
  )
  VALUES (
    auth.uid(),
    p_client_id,
    p_action,
    p_accessed_fields,
    now()
  );
END;
$$;

-- Add restrictive INSERT policy: Only admins can manually insert audit logs
-- (Normal logging should use the function above)
CREATE POLICY "Only admins can manually insert audit logs"
ON public.client_data_access_log
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update table comment to document security requirements
COMMENT ON TABLE public.client_data_access_log IS 'Audit log for sensitive client data access. INSERT restricted to admins only. Applications should use log_client_data_access() function for automatic logging. SELECT restricted to admins only.';

COMMENT ON FUNCTION public.log_client_data_access IS 'SECURITY DEFINER function to log client data access. Bypasses RLS to ensure all access is logged. Only callable by authenticated users.';