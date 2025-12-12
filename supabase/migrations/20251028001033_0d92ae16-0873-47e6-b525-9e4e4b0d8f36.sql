-- Table pour tracer toutes les actions sur les clients
CREATE TABLE IF NOT EXISTS public.client_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'assigned', 'reassigned', 'status_changed', 'document_added', etc.
  action_description TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  field_changed TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_client_activity_log_client_id ON public.client_activity_log(client_id);
CREATE INDEX idx_client_activity_log_created_at ON public.client_activity_log(created_at DESC);
CREATE INDEX idx_client_activity_log_user_id ON public.client_activity_log(user_id);

-- Enable RLS
ALTER TABLE public.client_activity_log ENABLE ROW LEVEL SECURITY;

-- Politique: les admins et managers peuvent tout voir
CREATE POLICY "Admins and managers can view all activity logs"
ON public.client_activity_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Politique: les employés peuvent voir les logs de leurs clients
CREATE POLICY "Employees can view logs of their assigned clients"
ON public.client_activity_log
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'employee'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.profiles p ON auth.uid() = p.id
    WHERE c.id = client_activity_log.client_id
    AND (
      c.assigned_employee = p.email OR
      c.assigned_employee = (p.first_name || ' ' || p.last_name) OR
      c.assigned_employee = p.first_name
    )
  )
);

-- Politique: tous les utilisateurs authentifiés peuvent créer des logs
CREATE POLICY "Authenticated users can insert activity logs"
ON public.client_activity_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Fonction pour logger automatiquement les modifications sur la table clients
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
        'تم تغيير حالة العميل من "' || COALESCE(OLD.status, 'غير محدد') || '" إلى "' || COALESCE(NEW.status, 'غير محدد') || '"',
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
    INSERT INTO public.client_activity_log (
      client_id,
      user_id,
      action_type,
      action_description,
      old_value
    ) VALUES (
      OLD.id,
      auth.uid(),
      'deleted',
      'تم حذف ملف العميل',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Créer le trigger sur la table clients
DROP TRIGGER IF EXISTS trigger_log_client_changes ON public.clients;
CREATE TRIGGER trigger_log_client_changes
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_changes();