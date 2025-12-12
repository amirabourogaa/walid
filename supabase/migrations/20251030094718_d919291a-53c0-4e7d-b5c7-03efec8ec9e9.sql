-- Drop the existing foreign key constraint
ALTER TABLE client_activity_log
DROP CONSTRAINT IF EXISTS client_activity_log_client_id_fkey;

-- Add the foreign key constraint with ON DELETE CASCADE
ALTER TABLE client_activity_log
ADD CONSTRAINT client_activity_log_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;