-- Modifier le trigger pour ne pas logger lors de la suppression
-- car ON DELETE CASCADE s'en charge déjà
DROP TRIGGER IF EXISTS log_client_changes ON public.clients;

CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_action_type TEXT;
  v_description TEXT;
  v_field TEXT;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.client_activity_log (
      client_id,
      user_id,
      action_type,
      action_description,
      new_value
    ) VALUES (
      NEW.id,
      auth.uid(),
      'created',
      'تم إنشاء ملف العميل',
      to_jsonb(NEW)
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.client_activity_log (
        client_id,
        user_id,
        action_type,
        action_description,
        field_changed,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'status_changed',
        'تم تغيير حالة العميل من "' || COALESCE(OLD.status::text, 'غير محدد') || '" إلى "' || COALESCE(NEW.status::text, 'غير محدد') || '"',
        'status',
        to_jsonb(OLD.status),
        to_jsonb(NEW.status)
      );
    END IF;
    
    -- Log assignment changes
    IF OLD.assigned_employee IS DISTINCT FROM NEW.assigned_employee THEN
      INSERT INTO public.client_activity_log (
        client_id,
        user_id,
        action_type,
        action_description,
        field_changed,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'reassigned',
        'تم إعادة تعيين العميل من "' || COALESCE(OLD.assigned_employee, 'غير محدد') || '" إلى "' || COALESCE(NEW.assigned_employee, 'غير محدد') || '"',
        'assigned_employee',
        to_jsonb(OLD.assigned_employee),
        to_jsonb(NEW.assigned_employee)
      );
    END IF;
    
    -- Log document additions
    IF OLD.documents_urls IS DISTINCT FROM NEW.documents_urls AND 
       array_length(NEW.documents_urls, 1) > COALESCE(array_length(OLD.documents_urls, 1), 0) THEN
      INSERT INTO public.client_activity_log (
        client_id,
        user_id,
        action_type,
        action_description,
        field_changed,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'document_added',
        'تم إضافة مستندات جديدة',
        'documents_urls',
        to_jsonb(NEW.documents_urls)
      );
    END IF;
    
    -- Log general updates (if fields changed but not caught above)
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO public.client_activity_log (
        client_id,
        user_id,
        action_type,
        action_description,
        old_value,
        new_value
      ) VALUES (
        NEW.id,
        auth.uid(),
        'updated',
        'تم تحديث معلومات العميل',
        to_jsonb(OLD),
        to_jsonb(NEW)
      );
    END IF;
    
    RETURN NEW;
    
  ELSIF (TG_OP = 'DELETE') THEN
    -- Ne rien faire ici, ON DELETE CASCADE s'occupe de supprimer les logs automatiquement
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$function$;

-- Recréer le trigger
CREATE TRIGGER log_client_changes
BEFORE INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_changes();