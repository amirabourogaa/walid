-- Ajouter une politique pour permettre aux admins et managers de voir tous les rôles
CREATE POLICY "Admins and managers can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);