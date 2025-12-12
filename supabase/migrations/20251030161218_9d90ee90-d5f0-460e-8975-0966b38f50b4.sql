-- Add column to store the archive file path
ALTER TABLE transactions_archive 
ADD COLUMN IF NOT EXISTS archive_file_path TEXT;