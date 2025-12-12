-- Create transactions history table
CREATE TABLE IF NOT EXISTS public.transactions_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  data jsonb NOT NULL,
  modified_by uuid REFERENCES auth.users(id),
  modified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create invoices history table
CREATE TABLE IF NOT EXISTS public.invoices_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  data jsonb NOT NULL,
  modified_by uuid REFERENCES auth.users(id),
  modified_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for transactions_history
CREATE POLICY "Managers can view transactions history"
ON public.transactions_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Authenticated users can insert transactions history"
ON public.transactions_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- RLS policies for invoices_history
CREATE POLICY "Managers can view invoices history"
ON public.invoices_history
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

CREATE POLICY "Authenticated users can insert invoices history"
ON public.invoices_history
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'employee'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_transactions_history_transaction_id ON public.transactions_history(transaction_id);
CREATE INDEX idx_transactions_history_modified_at ON public.transactions_history(modified_at DESC);
CREATE INDEX idx_invoices_history_invoice_id ON public.invoices_history(invoice_id);
CREATE INDEX idx_invoices_history_modified_at ON public.invoices_history(modified_at DESC);

-- Function to log transaction changes
CREATE OR REPLACE FUNCTION public.log_transaction_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log invoice changes
CREATE OR REPLACE FUNCTION public.log_invoice_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER transactions_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.log_transaction_change();

CREATE TRIGGER invoices_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.log_invoice_change();