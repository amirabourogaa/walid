-- Add email field to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS email TEXT;