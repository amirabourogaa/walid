-- Nettoyage des duplicatas dans client_folders
-- On garde seulement le dossier le plus récent pour chaque combinaison client_id + destination_country

-- D'abord, créer une fonction pour normaliser les pays (CN -> الصين, DE -> ألمانيا, etc.)
CREATE OR REPLACE FUNCTION normalize_country_name(country TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN country IN ('CN', 'China', 'china') THEN 'الصين'
    WHEN country IN ('DE', 'Germany', 'germany') THEN 'ألمانيا'
    WHEN country IN ('FR', 'France', 'france') THEN 'فرنسا'
    WHEN country IN ('TR', 'Turkey', 'turkey') THEN 'تركيا'
    WHEN country IN ('IN', 'India', 'india') THEN 'الهند'
    WHEN country IN ('NL', 'Netherlands', 'netherlands') THEN 'هولندا'
    ELSE country
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mettre à jour tous les pays pour les normaliser
UPDATE client_folders 
SET destination_country = normalize_country_name(destination_country)
WHERE destination_country IS NOT NULL;

-- Supprimer les duplicatas en gardant seulement le plus récent pour chaque client + destination
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY client_id, COALESCE(destination_country, 'غير محدد'), is_archived 
      ORDER BY created_at DESC
    ) as rn
  FROM client_folders
  WHERE is_archived = false
)
DELETE FROM client_folders
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Mettre à jour la fonction manage_client_folder pour utiliser la normalisation
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
  v_normalized_country TEXT;
BEGIN
  -- Normaliser le nom du pays
  v_normalized_country := normalize_country_name(NEW.destination_country);
  
  -- Construire le préfixe avec le client_id_number si disponible
  IF NEW.client_id_number IS NOT NULL AND NEW.client_id_number <> '' THEN
    v_client_id_prefix := NEW.client_id_number || ' - ';
  ELSE
    v_client_id_prefix := '';
  END IF;
  
  -- Ajouter la destination pour différencier les demandes
  IF v_normalized_country IS NOT NULL AND v_normalized_country <> '' THEN
    v_destination_suffix := ' - ' || v_normalized_country;
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
      AND destination_country = v_normalized_country
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
        folder_name = v_folder_name,
        destination_country = v_normalized_country
      WHERE id = v_existing_folder_id;
    END IF;
  ELSE
    -- Pour les dossiers non terminés, vérifier s'il existe déjà un dossier actif
    SELECT id INTO v_existing_folder_id
    FROM public.client_folders
    WHERE client_id = NEW.id
      AND destination_country = v_normalized_country
      AND is_archived = false
    LIMIT 1;
    
    IF v_existing_folder_id IS NOT NULL THEN
      -- Mettre à jour le dossier existant au lieu d'en créer un nouveau
      UPDATE public.client_folders
      SET
        passport_number = NEW.passport_number,
        full_name = NEW.full_name,
        destination_country = v_normalized_country,
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
        IF (normalize_country_name(OLD.destination_country) IS DISTINCT FROM v_normalized_country) OR
           (OLD.visa_tracking_status = 'اكتملت العملية' AND NEW.visa_tracking_status != 'اكتملت العملية') THEN
          v_should_create_folder := true;
        END IF;
      END IF;
      
      -- Créer un nouveau dossier seulement si nécessaire
      IF v_should_create_folder AND v_normalized_country IS NOT NULL THEN
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
          v_normalized_country,
          NEW.service_type
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;