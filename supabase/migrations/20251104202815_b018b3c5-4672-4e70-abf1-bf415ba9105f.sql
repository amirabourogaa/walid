-- Fonction corrigée pour éviter la création automatique de dossiers après archivage
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
  v_should_create_folder BOOLEAN;
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
      -- Déterminer si on doit créer un nouveau dossier
      v_should_create_folder := false;
      
      IF TG_OP = 'INSERT' THEN
        -- Nouveau client: créer un dossier
        v_should_create_folder := true;
      ELSIF TG_OP = 'UPDATE' THEN
        -- Créer un dossier seulement si:
        -- 1. La destination a changé (nouvelle opération pour une autre destination)
        -- 2. OU le statut vient de changer de "اكتملت العملية" vers autre chose (relance d'opération)
        IF (OLD.destination_country IS DISTINCT FROM NEW.destination_country) OR
           (OLD.visa_tracking_status = 'اكتملت العملية' AND NEW.visa_tracking_status != 'اكتملت العملية') THEN
          v_should_create_folder := true;
        END IF;
      END IF;
      
      -- Créer un nouveau dossier seulement si nécessaire
      IF v_should_create_folder AND NEW.destination_country IS NOT NULL THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;