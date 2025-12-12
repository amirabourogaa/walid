-- Nettoyer les profils orphelins (profils sans utilisateur correspondant dans auth.users)
-- Cette migration supprime les profils qui n'ont pas d'utilisateur authentifié correspondant

-- D'abord, supprimer les rôles des utilisateurs orphelins
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT p.id 
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE u.id IS NULL
);

-- Ensuite, supprimer les profils orphelins
DELETE FROM public.profiles
WHERE id IN (
  SELECT p.id 
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  WHERE u.id IS NULL
);

-- Créer une fonction pour vérifier la cohérence entre auth.users et profiles
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_profiles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Supprimer les rôles orphelins
  DELETE FROM public.user_roles
  WHERE user_id NOT IN (SELECT id FROM auth.users);
  
  -- Supprimer les profils orphelins
  DELETE FROM public.profiles
  WHERE id NOT IN (SELECT id FROM auth.users);
  
  RAISE NOTICE 'Orphaned profiles cleaned up successfully';
END;
$$;

COMMENT ON FUNCTION public.cleanup_orphaned_profiles IS 'Nettoie les profils et rôles qui n''ont pas d''utilisateur correspondant dans auth.users';