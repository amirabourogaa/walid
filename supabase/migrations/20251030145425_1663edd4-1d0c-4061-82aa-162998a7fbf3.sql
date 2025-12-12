-- Permettre plusieurs demandes par client en modifiant la contrainte d'unicité
-- Supprimer l'ancienne contrainte unique sur (client_id, folder_path)
ALTER TABLE public.client_folders 
DROP CONSTRAINT IF EXISTS client_folders_client_id_folder_path_key;

-- Ajouter une contrainte unique sur folder_path uniquement (chaque dossier doit être unique)
ALTER TABLE public.client_folders 
ADD CONSTRAINT client_folders_folder_path_key UNIQUE (folder_path);

-- Ajouter un index sur client_id pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_client_folders_client_id ON public.client_folders(client_id);

-- Ajouter un index sur is_archived pour les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_client_folders_archived ON public.client_folders(is_archived);

-- Mettre à jour la fonction pour créer des dossiers uniques par demande
CREATE OR REPLACE FUNCTION public.manage_client_folder()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_folder_name TEXT;
  v_folder_path TEXT;
  v_client_id_prefix TEXT;
  v_destination_suffix TEXT;
  v_existing_count INTEGER;
BEGIN
  -- Construire le préfixe avec le client_id_number si disponible
  IF NEW.client_id_number IS NOT NULL AND NEW.client_id_number <> '' THEN
    v_client_id_prefix := NEW.client_id_number || ' - ';
  ELSE
    v_client_id_prefix := '';
  END IF;
  
  -- Ajouter la destination pour différencier les demandes
  IF NEW.destination_country IS NOT NULL AND NEW.destination_country <> '' THEN
    v_destination_suffix := ' - ' || NEW.destination_country;
  ELSE
    v_destination_suffix := '';
  END IF;
  
  -- Construire le nom du dossier avec destination
  IF NEW.passport_number IS NOT NULL AND NEW.passport_number <> '' THEN
    v_folder_name := v_client_id_prefix || NEW.full_name || ' - ' || NEW.passport_number || v_destination_suffix;
  ELSE
    v_folder_name := v_client_id_prefix || NEW.full_name || v_destination_suffix;
  END IF;
  
  -- Vérifier si un dossier avec le même nom existe déjà
  SELECT COUNT(*) INTO v_existing_count
  FROM public.client_folders
  WHERE client_id = NEW.id 
    AND destination_country = NEW.destination_country
    AND is_archived = false;
  
  -- Si un dossier actif existe déjà pour cette destination, ajouter un numéro
  IF v_existing_count > 0 THEN
    v_folder_name := v_folder_name || ' (' || (v_existing_count + 1)::text || ')';
  END IF;
  
  v_folder_path := '/clients/' || v_folder_name;
  
  -- Chercher un dossier existant pour cette demande spécifique (client + destination)
  -- Si le statut devient "اكتملت العملية", archiver ce dossier spécifique
  IF NEW.visa_tracking_status = 'اكتملت العملية' THEN
    UPDATE public.client_folders
    SET 
      is_archived = true,
      archived_at = now(),
      completion_date = CURRENT_DATE,
      passport_number = NEW.passport_number,
      full_name = NEW.full_name,
      service_type = NEW.service_type
    WHERE client_id = NEW.id
      AND destination_country = NEW.destination_country
      AND is_archived = false;
  ELSE
    -- Insérer ou mettre à jour le dossier actif
    INSERT INTO public.client_folders (
      client_id,
      folder_name,
      folder_path,
      passport_number,
      full_name,
      destination_country,
      service_type
    ) VALUES (
      NEW.id,
      v_folder_name,
      v_folder_path,
      NEW.passport_number,
      NEW.full_name,
      NEW.destination_country,
      NEW.service_type
    )
    ON CONFLICT (folder_path)
    DO UPDATE SET
      passport_number = NEW.passport_number,
      full_name = NEW.full_name,
      destination_country = NEW.destination_country,
      service_type = NEW.service_type,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$;