-- Add qr_code_data column to clients table and remove barcode_data
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS qr_code_data text;

-- Copy existing barcode data to qr_code_data if needed
UPDATE public.clients 
SET qr_code_data = barcode_data 
WHERE barcode_data IS NOT NULL AND qr_code_data IS NULL;

-- Drop the old barcode_data column
ALTER TABLE public.clients 
  DROP COLUMN IF EXISTS barcode_data;