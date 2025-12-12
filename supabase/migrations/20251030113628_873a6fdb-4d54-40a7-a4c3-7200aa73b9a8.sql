-- Drop and recreate the foreign key constraint as deferrable
ALTER TABLE public.client_activity_log
DROP CONSTRAINT IF EXISTS client_activity_log_client_id_fkey;

ALTER TABLE public.client_activity_log
ADD CONSTRAINT client_activity_log_client_id_fkey
FOREIGN KEY (client_id) REFERENCES public.clients(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;