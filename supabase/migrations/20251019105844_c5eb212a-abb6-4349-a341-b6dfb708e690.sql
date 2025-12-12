-- Fix search_path for log_transaction_change function
CREATE OR REPLACE FUNCTION public.log_transaction_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.transactions_history (transaction_id, action, data, modified_by)
    VALUES (OLD.id, 'deleted', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.transactions_history (transaction_id, action, data, modified_by)
    VALUES (NEW.id, 'updated', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.transactions_history (transaction_id, action, data, modified_by)
    VALUES (NEW.id, 'created', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Fix search_path for log_invoice_change function
CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.invoices_history (invoice_id, action, data, modified_by)
    VALUES (OLD.id, 'deleted', row_to_json(OLD)::jsonb, auth.uid());
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.invoices_history (invoice_id, action, data, modified_by)
    VALUES (NEW.id, 'updated', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.invoices_history (invoice_id, action, data, modified_by)
    VALUES (NEW.id, 'created', row_to_json(NEW)::jsonb, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;