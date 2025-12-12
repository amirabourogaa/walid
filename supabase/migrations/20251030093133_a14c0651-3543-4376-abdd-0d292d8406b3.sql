-- Make the foreign key constraint deferrable to allow trigger insertions during deletion
ALTER TABLE client_activity_log 
DROP CONSTRAINT IF EXISTS client_activity_log_client_id_fkey;

ALTER TABLE client_activity_log
ADD CONSTRAINT client_activity_log_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;