-- Add new status to client_status enum if not exists (with space, not underscore)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'اكتملت العملية' 
    AND enumtypid = 'client_status'::regtype
  ) THEN
    ALTER TYPE client_status ADD VALUE 'اكتملت العملية';
  END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_client_status_with_visa_tracking_trigger ON public.clients;

-- Update the trigger function to use correct status with space
CREATE OR REPLACE FUNCTION public.sync_client_status_with_visa_tracking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Si le visa_tracking_status change vers un état de traitement
  IF NEW.visa_tracking_status IN (
    'تم التقديم في السيستام',
    'تم قبول التأشيرة',
    'التأشيرة غير موافق عليها',
    'تم التقديم الي السفارة'
  ) AND (OLD.visa_tracking_status IS DISTINCT FROM NEW.visa_tracking_status) THEN
    -- Changer le statut de "جديد" vers "قيد المعالجة"
    IF OLD.status = 'جديد' OR NEW.status = 'جديد' THEN
      NEW.status := 'قيد المعالجة'::client_status;
    END IF;
  END IF;
  
  -- Si le visa_tracking_status change vers "اكتملت العملية"
  IF NEW.visa_tracking_status = 'اكتملت العملية' 
     AND (OLD.visa_tracking_status IS DISTINCT FROM NEW.visa_tracking_status) THEN
    NEW.status := 'اكتملت العملية'::client_status;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger
CREATE TRIGGER sync_client_status_with_visa_tracking_trigger
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_status_with_visa_tracking();