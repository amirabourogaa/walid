-- Rendre client_id nullable pour permettre les clients saisis manuellement
ALTER TABLE public.invoices ALTER COLUMN client_id DROP NOT NULL;

-- Ajouter un commentaire pour documenter cette modification
COMMENT ON COLUMN public.invoices.client_id IS 'UUID du client dans la table clients, ou NULL si client saisi manuellement';