-- Create enum for currency types
CREATE TYPE public.currency_type AS ENUM ('TND', 'EUR', 'USD', 'DLY');

-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('courant', 'epargne', 'autre');

-- Create enum for transaction types
CREATE TYPE public.transaction_type AS ENUM ('entree', 'sortie');

-- Create enum for payment methods
CREATE TYPE public.payment_method AS ENUM ('espece', 'cheque', 'virement', 'carte_bancaire', 'traite');

-- Create enum for transaction categories
CREATE TYPE public.transaction_category AS ENUM (
  'loyer', 'steg', 'sonede', 'internet', 'mobile', 'bon_cadeau',
  'fournisseur', 'ambassade', 'transport', 'salaire', 'cnss', 
  'finance', 'autre'
);

-- Create caisses table
CREATE TABLE public.caisses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  emplacement TEXT,
  montants JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {currency: 'TND', amount: 0}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comptes_bancaires table
CREATE TABLE public.comptes_bancaires (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_banque TEXT NOT NULL,
  type_compte account_type NOT NULL DEFAULT 'courant',
  montants JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {currency: 'TND', amount: 0}
  code_secret TEXT, -- Encrypted secret code for viewing amounts
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type transaction_type NOT NULL,
  categorie transaction_category NOT NULL,
  description TEXT,
  montant NUMERIC NOT NULL,
  devise currency_type NOT NULL,
  mode_paiement payment_method NOT NULL,
  source_type TEXT, -- 'caisse' or 'compte_bancaire'
  source_id UUID, -- Reference to caisse or compte_bancaire
  date_transaction DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.caisses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comptes_bancaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for caisses
CREATE POLICY "Managers can view all caisses"
  ON public.caisses FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Managers can insert caisses"
  ON public.caisses FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update caisses"
  ON public.caisses FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete caisses"
  ON public.caisses FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create RLS policies for comptes_bancaires
CREATE POLICY "Managers can view all comptes"
  ON public.comptes_bancaires FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Managers can insert comptes"
  ON public.comptes_bancaires FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can update comptes"
  ON public.comptes_bancaires FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete comptes"
  ON public.comptes_bancaires FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create RLS policies for transactions
CREATE POLICY "Managers can view all transactions"
  ON public.transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Managers can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Managers can update transactions"
  ON public.transactions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "Managers can delete transactions"
  ON public.transactions FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_caisses_updated_at
  BEFORE UPDATE ON public.caisses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comptes_bancaires_updated_at
  BEFORE UPDATE ON public.comptes_bancaires
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();