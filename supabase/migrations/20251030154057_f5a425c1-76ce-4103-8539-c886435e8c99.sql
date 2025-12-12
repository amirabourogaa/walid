-- Create transactions_archive table
CREATE TABLE IF NOT EXISTS public.transactions_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_transaction_id uuid NOT NULL,
  type transaction_type NOT NULL,
  categorie transaction_category NOT NULL,
  montant numeric NOT NULL,
  devise text NOT NULL,
  mode_paiement payment_method NOT NULL,
  description text,
  date_transaction date NOT NULL,
  source_type text,
  source_id uuid,
  created_by uuid,
  archived_at timestamp with time zone NOT NULL DEFAULT now(),
  archive_month integer NOT NULL,
  archive_year integer NOT NULL,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL
);

-- Enable RLS
ALTER TABLE public.transactions_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Managers can view archived transactions"
  ON public.transactions_archive
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

CREATE POLICY "Managers can insert archived transactions"
  ON public.transactions_archive
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Add index for faster queries
CREATE INDEX idx_transactions_archive_month_year ON public.transactions_archive(archive_year, archive_month);
CREATE INDEX idx_transactions_archive_date ON public.transactions_archive(date_transaction);