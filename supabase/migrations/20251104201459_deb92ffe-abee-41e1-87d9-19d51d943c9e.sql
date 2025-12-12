-- Supprimer les triggers existants
DROP TRIGGER IF EXISTS manage_client_folder_trigger ON clients;

-- Fonction améliorée pour gérer les dossiers clients sans duplication
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
  v_existing_folder_id UUID;
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
  
  v_folder_path := '/clients/' || v_folder_name;
  
  -- Si le statut devient "اكتملت العملية", archiver le dossier actif
  IF NEW.visa_tracking_status = 'اكتملت العملية' THEN
    -- Chercher le dossier actif pour ce client + destination
    SELECT id INTO v_existing_folder_id
    FROM public.client_folders
    WHERE client_id = NEW.id
      AND destination_country = NEW.destination_country
      AND is_archived = false
    LIMIT 1;
    
    -- Archiver le dossier s'il existe
    IF v_existing_folder_id IS NOT NULL THEN
      UPDATE public.client_folders
      SET 
        is_archived = true,
        archived_at = now(),
        completion_date = CURRENT_DATE,
        passport_number = NEW.passport_number,
        full_name = NEW.full_name,
        service_type = NEW.service_type,
        folder_name = v_folder_name
      WHERE id = v_existing_folder_id;
    END IF;
  ELSE
    -- Pour les dossiers non terminés, vérifier s'il existe déjà un dossier actif
    SELECT id INTO v_existing_folder_id
    FROM public.client_folders
    WHERE client_id = NEW.id
      AND destination_country = NEW.destination_country
      AND is_archived = false
    LIMIT 1;
    
    IF v_existing_folder_id IS NOT NULL THEN
      -- Mettre à jour le dossier existant au lieu d'en créer un nouveau
      UPDATE public.client_folders
      SET
        passport_number = NEW.passport_number,
        full_name = NEW.full_name,
        destination_country = NEW.destination_country,
        service_type = NEW.service_type,
        folder_name = v_folder_name,
        folder_path = v_folder_path,
        updated_at = now()
      WHERE id = v_existing_folder_id;
    ELSE
      -- Créer un nouveau dossier seulement s'il n'existe pas
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
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recréer le trigger
CREATE TRIGGER manage_client_folder_trigger
  AFTER INSERT OR UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION manage_client_folder();

-- Nettoyer les doublons existants - garder seulement le plus récent pour chaque client + destination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, destination_country, is_archived 
      ORDER BY created_at DESC
    ) as rn
  FROM client_folders
)
DELETE FROM client_folders
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);