-- Ajouter les champs d'encaissement et mode de paiement aux factures
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS collection_source_type TEXT CHECK (collection_source_type IN ('caisse', 'compte_bancaire')),
ADD COLUMN IF NOT EXISTS collection_source_id UUID,
ADD COLUMN IF NOT EXISTS payment_mode TEXT CHECK (payment_mode IN ('espèce', 'chèque', 'virement', 'traite', 'carte_bancaire', 'autre'));

-- Ajouter un commentaire pour documentation
COMMENT ON COLUMN invoices.collection_source_type IS 'Type de source d''encaissement: caisse ou compte bancaire';
COMMENT ON COLUMN invoices.collection_source_id IS 'ID de la caisse ou du compte bancaire pour l''encaissement';
COMMENT ON COLUMN invoices.payment_mode IS 'Mode de paiement: espèce, chèque, virement, traite, carte bancaire, autre';