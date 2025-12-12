-- Create notifications table for employees
CREATE TABLE IF NOT EXISTS public.employee_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Add index for faster queries
CREATE INDEX idx_employee_notifications_employee_id ON public.employee_notifications(employee_id);
CREATE INDEX idx_employee_notifications_read ON public.employee_notifications(read);
CREATE INDEX idx_employee_notifications_created_at ON public.employee_notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.employee_notifications ENABLE ROW LEVEL SECURITY;

-- Employees can view their own notifications
CREATE POLICY "Employees can view their own notifications"
ON public.employee_notifications
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees WHERE id = employee_notifications.employee_id
  )
);

-- Employees can update their own notifications (mark as read)
CREATE POLICY "Employees can update their own notifications"
ON public.employee_notifications
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT user_id FROM public.employees WHERE id = employee_notifications.employee_id
  )
);

-- Managers can insert notifications
CREATE POLICY "Managers can insert notifications"
ON public.employee_notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Function to create notification when client is assigned
CREATE OR REPLACE FUNCTION public.notify_employee_on_client_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id UUID;
  v_client_name TEXT;
BEGIN
  -- Get employee ID from assigned_employee name
  SELECT id INTO v_employee_id
  FROM public.employees
  WHERE name = NEW.assigned_employee OR email = NEW.assigned_employee
  LIMIT 1;
  
  -- Only proceed if employee exists
  IF v_employee_id IS NOT NULL THEN
    -- Get client name
    v_client_name := NEW.full_name;
    
    -- Create notification
    INSERT INTO public.employee_notifications (
      employee_id,
      client_id,
      notification_type,
      title,
      message
    ) VALUES (
      v_employee_id,
      NEW.id,
      'new_client_assignment',
      'عميل جديد',
      'تم تعيين عميل جديد لك: ' || v_client_name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new client assignments
CREATE TRIGGER trigger_notify_employee_on_new_client
AFTER INSERT ON public.clients
FOR EACH ROW
WHEN (NEW.assigned_employee IS NOT NULL)
EXECUTE FUNCTION public.notify_employee_on_client_assignment();

-- Trigger for client reassignments
CREATE OR REPLACE FUNCTION public.notify_employee_on_client_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_employee_id UUID;
  v_client_name TEXT;
BEGIN
  -- Only notify if assigned_employee changed
  IF OLD.assigned_employee IS DISTINCT FROM NEW.assigned_employee AND NEW.assigned_employee IS NOT NULL THEN
    -- Get employee ID from assigned_employee name
    SELECT id INTO v_employee_id
    FROM public.employees
    WHERE name = NEW.assigned_employee OR email = NEW.assigned_employee
    LIMIT 1;
    
    -- Only proceed if employee exists
    IF v_employee_id IS NOT NULL THEN
      v_client_name := NEW.full_name;
      
      -- Create notification
      INSERT INTO public.employee_notifications (
        employee_id,
        client_id,
        notification_type,
        title,
        message
      ) VALUES (
        v_employee_id,
        NEW.id,
        'client_reassignment',
        'عميل معاد تعيينه',
        'تم تعيين عميل لك: ' || v_client_name
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_employee_on_client_reassignment
AFTER UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.notify_employee_on_client_reassignment();