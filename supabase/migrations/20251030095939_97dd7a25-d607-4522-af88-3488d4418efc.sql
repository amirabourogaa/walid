-- Add CASCADE delete to all foreign keys referencing clients table
-- This ensures when a client is deleted, all related data is automatically deleted

-- client_folders
ALTER TABLE client_folders
DROP CONSTRAINT IF EXISTS client_folders_client_id_fkey;

ALTER TABLE client_folders
ADD CONSTRAINT client_folders_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- appointments
ALTER TABLE appointments
DROP CONSTRAINT IF EXISTS appointments_client_id_fkey;

ALTER TABLE appointments
ADD CONSTRAINT appointments_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- applications
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_client_id_fkey;

ALTER TABLE applications
ADD CONSTRAINT applications_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- appointment_reminders
ALTER TABLE appointment_reminders
DROP CONSTRAINT IF EXISTS appointment_reminders_client_id_fkey;

ALTER TABLE appointment_reminders
ADD CONSTRAINT appointment_reminders_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- invoices
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_client_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- whatsapp_files
ALTER TABLE whatsapp_files
DROP CONSTRAINT IF EXISTS whatsapp_files_client_id_fkey;

ALTER TABLE whatsapp_files
ADD CONSTRAINT whatsapp_files_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;

-- client_assignments
ALTER TABLE client_assignments
DROP CONSTRAINT IF EXISTS client_assignments_client_id_fkey;

ALTER TABLE client_assignments
ADD CONSTRAINT client_assignments_client_id_fkey
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;