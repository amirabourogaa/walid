-- Create invoices_archive table
CREATE TABLE IF NOT EXISTS public.invoices_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_invoice_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  client_id UUID,
  client_name TEXT NOT NULL,
  client_whatsapp TEXT,
  client_tax_id TEXT,
  client_email TEXT,
  services JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tva_rate NUMERIC,
  tva_amount NUMERIC,
  discount_amount NUMERIC,
  timbre_fiscal NUMERIC,
  retenue_source_rate NUMERIC,
  retenue_source_amount NUMERIC,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TND'::text,
  status TEXT NOT NULL DEFAULT 'مسودة'::text,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fiscal_year INTEGER NOT NULL,
  collection_source_type TEXT,
  collection_source_id UUID,
  flight_departure_date DATE,
  flight_return_date DATE,
  flight_departure_city TEXT,
  flight_arrival_city TEXT,
  hotel_checkin_date DATE,
  hotel_checkout_date DATE,
  hotel_name TEXT,
  hotel_city TEXT,
  hotel_room_type TEXT,
  flight_traveler_name TEXT,
  hotel_guest_name TEXT,
  client_address TEXT,
  payment_mode TEXT,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.invoices_archive ENABLE ROW LEVEL SECURITY;

-- Create policy for managers
CREATE POLICY "Managers can view archived invoices" 
ON public.invoices_archive 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

-- Update existing invoices to use new numbering format
UPDATE public.invoices 
SET invoice_number = 'FAC0001/2025' 
WHERE client_name = 'JAWHARA PUB';

UPDATE public.invoices 
SET invoice_number = 'FAC0002/2025' 
WHERE client_name = 'STREAMLINK';

-- Create function to generate next invoice number
CREATE OR REPLACE FUNCTION public.get_next_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year INTEGER;
  last_number INTEGER;
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  -- Get last invoice number for current year
  SELECT COALESCE(
    MAX(
      CAST(
        SPLIT_PART(
          SPLIT_PART(invoice_number, 'FAC', 2),
          '/',
          1
        ) AS INTEGER
      )
    ),
    0
  )
  INTO last_number
  FROM invoices
  WHERE invoice_number LIKE 'FAC%/' || current_year::TEXT;
  
  next_number := last_number + 1;
  new_invoice_number := 'FAC' || LPAD(next_number::TEXT, 4, '0') || '/' || current_year::TEXT;
  
  RETURN new_invoice_number;
END;
$$;