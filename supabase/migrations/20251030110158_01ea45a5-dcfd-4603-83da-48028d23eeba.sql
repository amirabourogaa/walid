-- Ajouter le champ client_id_number (معرف العميل) à la table clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS client_id_number TEXT UNIQUE;

-- Créer une fonction pour générer le prochain numéro de client
CREATE OR REPLACE FUNCTION public.get_next_client_id_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER;
  last_number INTEGER;
  next_number INTEGER;
  new_client_id TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get last client number for current year
  SELECT COALESCE(
    MAX(
      CAST(
        SPLIT_PART(client_id_number, '/', 1) AS INTEGER
      )
    ),
    0
  )
  INTO last_number
  FROM clients
  WHERE client_id_number LIKE '%/' || current_year::TEXT;
  
  next_number := last_number + 1;
  new_client_id := LPAD(next_number::TEXT, 5, '0') || '/' || current_year::TEXT;
  
  RETURN new_client_id;
END;
$function$;

-- Mettre à jour le trigger manage_client_folder pour inclure le client_id_number dans le nom du dossier
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
BEGIN
  -- Construire le préfixe avec le client_id_number si disponible
  IF NEW.client_id_number IS NOT NULL AND NEW.client_id_number <> '' THEN
    v_client_id_prefix := NEW.client_id_number || ' - ';
  ELSE
    v_client_id_prefix := '';
  END IF;
  
  -- Construire le nom du dossier
  IF NEW.passport_number IS NOT NULL AND NEW.passport_number <> '' THEN
    v_folder_name := v_client_id_prefix || NEW.full_name || ' - ' || NEW.passport_number;
  ELSE
    v_folder_name := v_client_id_prefix || NEW.full_name;
  END IF;
  
  v_folder_path := '/clients/' || v_folder_name;
  
  -- Insérer ou mettre à jour le dossier
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
  ON CONFLICT (client_id, folder_path)
  DO UPDATE SET
    folder_name = v_folder_name,
    passport_number = NEW.passport_number,
    full_name = NEW.full_name,
    destination_country = NEW.destination_country,
    service_type = NEW.service_type,
    updated_at = now();
  
  -- Si le statut devient "اكتملت العملية", archiver le dossier
  IF NEW.visa_tracking_status = 'اكتملت العملية' AND 
     (OLD.visa_tracking_status IS NULL OR OLD.visa_tracking_status <> 'اكتملت العملية') THEN
    
    UPDATE public.client_folders
    SET 
      is_archived = true,
      archived_at = now(),
      completion_date = CURRENT_DATE
    WHERE client_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;