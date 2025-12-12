import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CurrencyAmount {
  currency: string;
  amount: number;
}

interface Caisse {
  id: string;
  nom: string;
  emplacement: string | null;
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

    console.log('Starting monthly caisses archival process...');

    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const archiveMonth = lastMonth.getMonth() + 1;
    const archiveYear = lastMonth.getFullYear();

    console.log(`Archiving caisses for ${archiveYear}-${archiveMonth}`);

    // Get all caisses
    const { data: caisses, error: caissesError } = await supabase
      .from('caisses')
      .select('*');

    if (caissesError) {
      console.error('Error fetching caisses:', caissesError);
      throw caissesError;
    }

    console.log(`Found ${caisses?.length || 0} caisses to archive`);

    // Get transactions for last month
    const firstDayLastMonth = new Date(archiveYear, archiveMonth - 1, 1);
    const lastDayLastMonth = new Date(archiveYear, archiveMonth, 0);

    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('source_type', 'caisse')
      .gte('date_transaction', firstDayLastMonth.toISOString().split('T')[0])
      .lte('date_transaction', lastDayLastMonth.toISOString().split('T')[0]);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      throw transactionsError;
    }

    console.log(`Found ${transactions?.length || 0} transactions for last month`);

    // Archive each caisse
    for (const caisse of caisses || []) {
      const caisseTransactions = (transactions || []).filter(
        (t: Transaction) => t.source_id === caisse.id
      );

      // Calculate financial summary per currency
      const financialSummary: Record<string, any> = {};

      (caisse.montants as CurrencyAmount[]).forEach((m: CurrencyAmount) => {
        const revenue = caisseTransactions
          .filter((t: Transaction) => t.devise === m.currency && t.type === 'entree')
          .reduce((sum: number, t: Transaction) => sum + Number(t.montant), 0);

        const expenses = caisseTransactions
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

      // Insert into archive
      const { error: archiveError } = await supabase
        .from('caisses_archive')
        .insert({
          original_caisse_id: caisse.id,
          nom: caisse.nom,
          emplacement: caisse.emplacement,
          montants: caisse.montants,
          financial_summary: financialSummary,
          archive_month: archiveMonth,
          archive_year: archiveYear,
          created_at: caisse.created_at,
        });

      if (archiveError) {
        console.error(`Error archiving caisse ${caisse.id}:`, archiveError);
        continue;
      }

      console.log(`Archived caisse: ${caisse.nom}`);

      // Reset caisse to zero
      const resetMontants = (caisse.montants as CurrencyAmount[]).map((m: CurrencyAmount) => ({
        ...m,
        amount: 0,
      }));

      const { error: updateError } = await supabase
        .from('caisses')
        .update({ montants: resetMontants })
        .eq('id', caisse.id);

      if (updateError) {
        console.error(`Error resetting caisse ${caisse.id}:`, updateError);
      } else {
        console.log(`Reset caisse: ${caisse.nom}`);
      }
    }

    console.log('Caisses archival process completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        archived: caisses?.length || 0,
        month: archiveMonth,
        year: archiveYear,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in archive-caisses function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
