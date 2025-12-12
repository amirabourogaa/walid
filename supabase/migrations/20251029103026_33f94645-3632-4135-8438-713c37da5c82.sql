-- Module 2 & 4: Ajouter le statut "قيد المعالجة" et table d'archivage des dossiers
-- Mettre à jour le type d'énumération du statut client pour ajouter "قيد المعالجة"
DO $$ BEGIN
  ALTER TYPE "public"."client_status" RENAME TO "client_status_old";
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

-- Créer le nouveau type avec le statut supplémentaire
DO $$ BEGIN
  CREATE TYPE "public"."client_status" AS ENUM (
    'جديد',
    'قيد المعالجة',
    'اكتملت العملية',
    'مرفوضة'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Mettre à jour la colonne status si elle existe
DO $$ BEGIN
  ALTER TABLE public.clients 
  ALTER COLUMN status TYPE text;
  
  ALTER TABLE public.clients 
  ALTER COLUMN status DROP DEFAULT;
  
  ALTER TABLE public.clients 
  ALTER COLUMN status TYPE public.client_status 
  USING status::public.client_status;
  
  ALTER TABLE public.clients 
  ALTER COLUMN status SET DEFAULT 'جديد'::public.client_status;
EXCEPTION
  WHEN OTHERS THEN null;
END $$;

-- Supprimer l'ancien type s'il existe
DROP TYPE IF EXISTS "public"."client_status_old" CASCADE;

-- Créer la table pour les dossiers archivés des clients
CREATE TABLE IF NOT EXISTS public.client_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  folder_name TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  
  -- Métadonnées du dossier
  passport_number TEXT,
  full_name TEXT NOT NULL,
  destination_country TEXT,
  service_type TEXT,
  completion_date DATE,
  
  UNIQUE(client_id, folder_path)
);

-- Activer RLS sur la table client_folders
ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour client_folders
CREATE POLICY "Managers can view all client folders"
ON public.client_folders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Managers can insert client folders"
ON public.client_folders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can update client folders"
ON public.client_folders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Créer une fonction pour créer/mettre à jour automatiquement le dossier client
CREATE OR REPLACE FUNCTION public.manage_client_folder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_folder_name TEXT;
  v_folder_path TEXT;
BEGIN
  -- Construire le nom du dossier
  IF NEW.passport_number IS NOT NULL AND NEW.passport_number <> '' THEN
    v_folder_name := NEW.full_name || ' - ' || NEW.passport_number;
  ELSE
    v_folder_name := NEW.full_name;
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
$$;

-- Créer le trigger pour gérer les dossiers clients
DROP TRIGGER IF EXISTS trigger_manage_client_folder ON public.clients;
CREATE TRIGGER trigger_manage_client_folder
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.manage_client_folder();

-- Créer la table pour les rappels automatiques
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL, -- 'embassy_receipt' ou 'visa_expiry'
  reminder_date DATE NOT NULL,
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS sur appointment_reminders
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour appointment_reminders
CREATE POLICY "Managers can view all reminders"
ON public.appointment_reminders
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Managers can insert reminders"
ON public.appointment_reminders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Fonction pour créer des rappels automatiques
CREATE OR REPLACE FUNCTION public.create_automatic_reminders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Créer un rappel pour la date de réception de l'ambassade (3 jours avant)
  IF NEW.embassy_receipt_date IS NOT NULL THEN
    INSERT INTO public.appointment_reminders (
      client_id,
      reminder_type,
      reminder_date,
      sent
    ) VALUES (
      NEW.id,
      'embassy_receipt',
      NEW.embassy_receipt_date - INTERVAL '3 days',
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Créer un rappel pour la fin du visa (7 jours avant)
  IF NEW.visa_end_date IS NOT NULL THEN
    INSERT INTO public.appointment_reminders (
      client_id,
      reminder_type,
      reminder_date,
      sent
    ) VALUES (
      NEW.id,
      'visa_expiry',
      NEW.visa_end_date - INTERVAL '7 days',
      false
    )
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour créer les rappels automatiques
DROP TRIGGER IF EXISTS trigger_create_reminders ON public.clients;
CREATE TRIGGER trigger_create_reminders
AFTER INSERT OR UPDATE OF embassy_receipt_date, visa_end_date ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.create_automatic_reminders();

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_client_folders_client_id ON public.client_folders(client_id);
CREATE INDEX IF NOT EXISTS idx_client_folders_archived ON public.client_folders(is_archived);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_client ON public.appointment_reminders(client_id);
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_date ON public.appointment_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_tracking_status ON public.clients(visa_tracking_status);