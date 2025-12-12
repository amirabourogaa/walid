-- Create caisses_archive table for monthly archives
CREATE TABLE IF NOT EXISTS public.caisses_archive (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_caisse_id UUID NOT NULL,
  nom TEXT NOT NULL,
  emplacement TEXT,
  montants JSONB NOT NULL DEFAULT '[]'::jsonb,
  financial_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  archive_month INTEGER NOT NULL,
  archive_year INTEGER NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.caisses_archive ENABLE ROW LEVEL SECURITY;

-- Create policies for caisses_archive
CREATE POLICY "Managers can view archived caisses"
ON public.caisses_archive
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers can insert archived caisses"
ON public.caisses_archive
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

-- Add index for faster queries
CREATE INDEX idx_caisses_archive_month_year ON public.caisses_archive(archive_year, archive_month);
CREATE INDEX idx_caisses_archive_caisse_id ON public.caisses_archive(original_caisse_id);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE caisses_archive;