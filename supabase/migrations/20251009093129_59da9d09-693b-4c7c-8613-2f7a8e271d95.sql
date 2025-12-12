-- SECURITY FIX: Add proper access control for employee profile data
-- Current state: Only self-access policies exist, no admin management capabilities
-- and no explicit policies to prevent unauthorized cross-user access

-- Add admin and manager access policies for employee management

-- SELECT: Admins and managers can view all profiles for HR purposes
CREATE POLICY "Admins and managers can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- UPDATE: Admins and managers can update all profiles for employee management
CREATE POLICY "Admins and managers can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add table comment documenting the security model
COMMENT ON TABLE public.profiles IS 'Employee profile information. SELECT access: users can view their own profile, admins/managers can view all profiles. UPDATE access: users can update their own profile, admins/managers can update all profiles. Employees and clients cannot view other users profiles.';

-- Add column comments for sensitive fields
COMMENT ON COLUMN public.profiles.email IS 'SENSITIVE: Employee email address. Visible to user themselves and admins/managers only.';
COMMENT ON COLUMN public.profiles.phone IS 'SENSITIVE: Employee phone number. Visible to user themselves and admins/managers only.';