-- Créer une fonction pour synchroniser automatiquement le statut du client avec l'état de la visa
CREATE OR REPLACE FUNCTION public.sync_client_status_with_visa_tracking()
RETURNS TRIGGER
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
    -- Changer le statut de "جديد" vers "قيد_المعالجة"
    IF OLD.status = 'جديد' OR NEW.status = 'جديد' THEN
      NEW.status := 'قيد_المعالجة'::client_status;
    END IF;
  END IF;
  
  -- Si le visa_tracking_status change vers "اكتملت العملية"
  IF NEW.visa_tracking_status = 'اكتملت العملية' 
     AND (OLD.visa_tracking_status IS DISTINCT FROM NEW.visa_tracking_status) THEN
    NEW.status := 'اكتملت_العملية'::client_status;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Créer le déclencheur pour synchroniser automatiquement le statut
DROP TRIGGER IF EXISTS trigger_sync_client_status ON public.clients;
CREATE TRIGGER trigger_sync_client_status
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_status_with_visa_tracking();