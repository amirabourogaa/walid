-- Ajout des nouveaux champs pour les clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS passport_expiry_date DATE,
ADD COLUMN IF NOT EXISTS company_name TEXT;

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON public.clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_passport_expiry_date ON public.clients(passport_expiry_date);