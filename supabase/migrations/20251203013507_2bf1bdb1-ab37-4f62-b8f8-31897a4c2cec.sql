CREATE OR REPLACE FUNCTION public.save_caisse_daily_snapshot(p_caisse_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caisse RECORD;
  v_transactions_summary JSONB;
  v_entrees_by_currency JSONB;
  v_sorties_by_currency JSONB;
  v_nombre_transactions INTEGER;
BEGIN
  SELECT id, nom, montants INTO v_caisse
  FROM caisses
  WHERE id = p_caisse_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caisse non trouvée';
  END IF;
  
  SELECT 
    COUNT(*) as nombre,
    COALESCE(jsonb_object_agg(
      devise, 
      entrees
    ) FILTER (WHERE entrees > 0), '{}'::jsonb) as entrees_by_currency,
    COALESCE(jsonb_object_agg(
      devise, 
      sorties
    ) FILTER (WHERE sorties > 0), '{}'::jsonb) as sorties_by_currency
  INTO v_nombre_transactions, v_entrees_by_currency, v_sorties_by_currency
  FROM (
    SELECT 
      devise,
      SUM(CASE WHEN type = 'entree' THEN montant ELSE 0 END) as entrees,
      SUM(CASE WHEN type = 'sortie' THEN montant ELSE 0 END) as sorties
    FROM transactions
    WHERE source_type = 'caisse'
    AND source_id = p_caisse_id
    AND date_transaction = p_date
    GROUP BY devise
  ) t;
  
  v_transactions_summary := jsonb_build_object(
    'entrees', COALESCE(v_entrees_by_currency, '{}'::jsonb),
    'sorties', COALESCE(v_sorties_by_currency, '{}'::jsonb),
    'nombre_transactions', COALESCE(v_nombre_transactions, 0)
  );
  
  INSERT INTO caisses_daily_history (
    caisse_id,
    history_date,
    montants_debut_journee,
    montants_fin_journee,
    transactions_summary
  ) VALUES (
    p_caisse_id,
    p_date,
    v_caisse.montants,
    v_caisse.montants,
    v_transactions_summary
  )
  ON CONFLICT (caisse_id, history_date)
  DO UPDATE SET
    montants_fin_journee = EXCLUDED.montants_fin_journee,
    transactions_summary = EXCLUDED.transactions_summary;
    
  RAISE NOTICE 'Snapshot quotidien sauvegardé avec succès';
END;
$$;