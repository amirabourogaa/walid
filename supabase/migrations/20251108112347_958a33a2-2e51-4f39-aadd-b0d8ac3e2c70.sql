-- Create bank accounts archive table
CREATE TABLE IF NOT EXISTS public.comptes_bancaires_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_compte_id UUID NOT NULL,
  nom_banque TEXT NOT NULL,
  type_compte account_type NOT NULL,
  montants JSONB NOT NULL DEFAULT '[]'::jsonb,
  financial_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  archive_month INTEGER NOT NULL,
  archive_year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comptes_bancaires_archive ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Managers can view archived bank accounts"
ON public.comptes_bancaires_archive
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Managers can insert archived bank accounts"
ON public.comptes_bancaires_archive
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- Create index for faster queries
CREATE INDEX idx_comptes_bancaires_archive_month_year 
ON public.comptes_bancaires_archive(archive_year, archive_month);

CREATE INDEX idx_comptes_bancaires_archive_original_id 
ON public.comptes_bancaires_archive(original_compte_id);