CREATE TABLE IF NOT EXISTS public.caisses_daily_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caisse_id UUID NOT NULL,
  history_date DATE NOT NULL,
  montants_debut_journee JSONB NOT NULL DEFAULT '[]'::jsonb,
  montants_fin_journee JSONB NOT NULL DEFAULT '[]'::jsonb,
  transactions_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(caisse_id, history_date)
);

CREATE INDEX idx_caisses_daily_history_caisse_id ON public.caisses_daily_history(caisse_id);
CREATE INDEX idx_caisses_daily_history_date ON public.caisses_daily_history(history_date DESC);

ALTER TABLE public.caisses_daily_history ENABLE ROW LEVEL SECURITY;