-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  whatsapp_number TEXT,
  passport_number TEXT,
  nationality TEXT,
  passport_status TEXT CHECK (passport_status IN ('موجود', 'غير موجود')),
  visa_tracking_status TEXT,
  assigned_employee TEXT,
  service_type TEXT,
  destination_country TEXT,
  china_visa_type TEXT,
  visa_type TEXT,
  profession TEXT,
  tax_id TEXT,
  personal_photo_url TEXT,
  passport_photo_url TEXT,
  documents_urls TEXT[],
  amount DECIMAL(10, 2),
  currency TEXT CHECK (currency IN ('USD', 'EUR', 'TND', 'DLY')),
  entry_status TEXT,
  submission_date DATE,
  embassy_receipt_date DATE,
  submitted_by TEXT,
  summary TEXT,
  notes TEXT,
  barcode_data TEXT,
  progress JSONB,
  status TEXT DEFAULT 'جديد',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to view clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (true);

-- Create storage bucket for client files
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Authenticated users can upload client files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can view client files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can update client files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'client-files');

CREATE POLICY "Authenticated users can delete client files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'client-files');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();