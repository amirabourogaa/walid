-- Add invoice_status column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS invoice_status text DEFAULT 'غير مدفوعة';