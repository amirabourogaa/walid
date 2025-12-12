import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface BankAccount {
  id: string;
  nom_banque: string;
  type_compte: string;
  montants: CurrencyAmount[];
  created_at: string;
}

interface Transaction {
  id: string;
  source_id: string;
  source_type: string;
  type: string;
  devise: string;
  montant: number;
  date_transaction: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting monthly bank accounts archival process...');

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const archiveMonth = lastMonth.getMonth() + 1;
    const archiveYear = lastMonth.getFullYear();

    console.log(`Archiving bank accounts for ${archiveYear}-${archiveMonth}`);

    // Get all bank accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('comptes_bancaires')
      .select('*');

    if (accountsError) {
      console.error('Error fetching bank accounts:', accountsError);
      throw accountsError;
    }

    console.log(`Found ${accounts?.length || 0} bank accounts to archive`);

    // Get transactions for last month
    const firstDayLastMonth = new Date(archiveYear, archiveMonth - 1, 1);
    const lastDayLastMonth = new Date(archiveYear, archiveMonth, 0);

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('source_type', 'compte_bancaire')
      .gte('date_transaction', firstDayLastMonth.toISOString().split('T')[0])
      .lte('date_transaction', lastDayLastMonth.toISOString().split('T')[0]);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }

    console.log(`Found ${transactions?.length || 0} transactions for last month`);

    // Archive each bank account
    for (const account of accounts || []) {
      const accountTransactions = (transactions || []).filter(
        (t: Transaction) => t.source_id === account.id
      );

      // Calculate financial summary per currency
      const financialSummary: Record<string, any> = {};

      (account.montants as CurrencyAmount[]).forEach((m: CurrencyAmount) => {
        const revenue = accountTransactions
          .filter((t: Transaction) => t.devise === m.currency && t.type === 'entree')
          .reduce((sum: number, t: Transaction) => sum + Number(t.montant), 0);

        const expenses = accountTransactions
          .filter((t: Transaction) => t.devise === m.currency && t.type === 'sortie')
          .reduce((sum: number, t: Transaction) => sum + Number(t.montant), 0);

        // Calcul: المبلغ الأول - المصروفات + الإيرادات = المبلغ المتبقي
        // Formula: Initial Amount - Expenses + Revenue = Balance
        const balance = m.amount - expenses + revenue;

        financialSummary[m.currency] = {
          initialAmount: m.amount,
          revenue,
          expenses,
          balance,
        };
      });

      // Insert into archive (NO RESET for bank accounts)
      const { error: archiveError } = await supabase
        .from('comptes_bancaires_archive')
        .insert({
          original_compte_id: account.id,
          nom_banque: account.nom_banque,
          type_compte: account.type_compte,
          montants: account.montants,
          financial_summary: financialSummary,
          archive_month: archiveMonth,
          archive_year: archiveYear,
          created_at: account.created_at,
        });

      if (archiveError) {
        console.error(`Error archiving bank account ${account.id}:`, archiveError);
        continue;
      }

      console.log(`Archived bank account: ${account.nom_banque}`);
      // NOTE: Unlike caisses, we do NOT reset bank account amounts
    }

    console.log('Bank accounts archival process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        archived: accounts?.length || 0,
        month: archiveMonth,
        year: archiveYear,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in archive-bank-accounts function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
