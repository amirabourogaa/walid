-- CRITICAL SECURITY FIX: Remove employee access to bank account secret codes
-- The 'code_secret' field contains sensitive banking credentials that should only be
-- accessible to admins and managers, not regular employees

-- Drop the existing SELECT policy that allows employees
DROP POLICY IF EXISTS "Managers can view all comptes" ON public.comptes_bancaires;

-- Recreate the SELECT policy WITHOUT employee access
CREATE POLICY "Only admins and managers can view bank accounts"
ON public.comptes_bancaires
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add comment documenting the security requirements
COMMENT ON COLUMN public.comptes_bancaires.code_secret IS 'SENSITIVE: Bank account secret code. Access restricted to admins and managers only.';
COMMENT ON TABLE public.comptes_bancaires IS 'Contains sensitive banking information including secret codes. SELECT access restricted to admins and managers only.';