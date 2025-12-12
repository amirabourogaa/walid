-- Create trigger for client activity logging
DROP TRIGGER IF EXISTS log_client_changes_trigger ON public.clients;

CREATE TRIGGER log_client_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.log_client_changes();

-- Create trigger for automatic reminders
DROP TRIGGER IF EXISTS create_automatic_reminders_trigger ON public.clients;

CREATE TRIGGER create_automatic_reminders_trigger
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.create_automatic_reminders();

-- Create trigger for client folder management
DROP TRIGGER IF EXISTS manage_client_folder_trigger ON public.clients;

CREATE TRIGGER manage_client_folder_trigger
AFTER INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.manage_client_folder();