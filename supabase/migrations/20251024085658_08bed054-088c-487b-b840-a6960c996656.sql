-- Ajouter une fonction pour créer un employé complet avec authentification
CREATE OR REPLACE FUNCTION public.create_employee_account(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_employee_name TEXT;
BEGIN
  -- Créer l'utilisateur dans auth.users via l'API admin
  -- Note: Cette fonction doit être appelée depuis le backend
  -- Pour l'instant, on retourne NULL et on laisse le frontend gérer la création
  
  -- Construire le nom complet
  v_employee_name := p_first_name || ' ' || p_last_name;
  
  RETURN NULL;
END;
$$;

-- Modifier la table employees pour lier avec les profils
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS profile_synced boolean DEFAULT false;

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_employee ON public.clients(assigned_employee);

COMMENT ON COLUMN public.employees.user_id IS 'Référence au compte utilisateur authentifié';
COMMENT ON COLUMN public.employees.profile_synced IS 'Indique si l''employé est synchronisé avec un profil utilisateur';