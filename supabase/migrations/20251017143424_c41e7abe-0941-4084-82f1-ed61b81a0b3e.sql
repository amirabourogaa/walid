-- Create missing transaction for STREAMLINK invoice (if not exists)
DO $$
DECLARE
  v_streamlink_exists BOOLEAN;
BEGIN
  -- Check if STREAMLINK transaction already exists
  SELECT EXISTS (
    SELECT 1 FROM transactions WHERE description LIKE '%FAC0002/2025%'
  ) INTO v_streamlink_exists;
  
  -- Only insert if it doesn't exist
  IF NOT v_streamlink_exists THEN
    INSERT INTO transactions (
      type, 
      categorie, 
      montant, 
      devise, 
      mode_paiement, 
      source_type, 
      description, 
      date_transaction
    )
    SELECT 
      'entree',
      'autre',
      1667,
      'TND',
      'virement',
      'compte_bancaire',
      'Encaissement facture FAC0002/2025 - STREAMLINK',
      '2025-10-14'
    WHERE EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoice_number = 'FAC0002/2025' 
      AND status = 'مدفوعة'
    );
  END IF;
END $$;

-- Synchronize bank account balances with paid invoices
DO $$
DECLARE
  v_compte_id UUID;
  v_current_montants JSONB;
  v_new_montants JSONB;
  v_tnd_amount NUMERIC := 0;
  v_exists BOOLEAN;
  v_jawhara_amount NUMERIC := 1191;
  v_streamlink_amount NUMERIC := 1667;
BEGIN
  -- Find بنك الوفاق or create it if it doesn't exist
  SELECT id, montants INTO v_compte_id, v_current_montants
  FROM comptes_bancaires
  WHERE nom_banque = 'بنك الوفاق'
  LIMIT 1;
  
  -- If بنك الوفاق doesn't exist, create it
  IF v_compte_id IS NULL THEN
    INSERT INTO comptes_bancaires (nom_banque, type_compte, montants)
    VALUES (
      'بنك الوفاق',
      'courant',
      '[{"currency": "TND", "amount": 0}]'::jsonb
    )
    RETURNING id, montants INTO v_compte_id, v_current_montants;
  END IF;
  
  -- Update invoices to link to this bank account
  UPDATE invoices
  SET collection_source_id = v_compte_id,
      collection_source_type = 'compte_bancaire'
  WHERE invoice_number IN ('FAC0001/2025', 'FAC0002/2025')
    AND collection_source_id IS NULL;
  
  -- Calculate total TND from both paid invoices
  v_tnd_amount := v_jawhara_amount + v_streamlink_amount;
  
  -- Check if TND exists in montants array
  SELECT EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(v_current_montants) elem
    WHERE elem->>'currency' = 'TND'
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Update existing TND amount
    SELECT jsonb_agg(
      CASE 
        WHEN elem->>'currency' = 'TND' THEN
          jsonb_build_object(
            'currency', 'TND',
            'amount', ((elem->>'amount')::numeric + v_tnd_amount)
          )
        ELSE elem
      END
    )
    INTO v_new_montants
    FROM jsonb_array_elements(v_current_montants) elem;
  ELSE
    -- Add new TND entry
    v_new_montants := v_current_montants || jsonb_build_object('currency', 'TND', 'amount', v_tnd_amount)::jsonb;
  END IF;
  
  -- Update the bank account with new montants
  UPDATE comptes_bancaires
  SET montants = v_new_montants
  WHERE id = v_compte_id;
  
  -- Also update source_id in transactions for both invoices
  UPDATE transactions
  SET source_id = v_compte_id
  WHERE description LIKE '%FAC0001/2025%' OR description LIKE '%FAC0002/2025%';
END $$;