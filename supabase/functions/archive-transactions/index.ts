import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get month name in French
const getMonthName = (month: number): string => {
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  return months[month - 1];
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting transaction archiving process...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    
    // Determine the month and year to archive (previous month)
    const archiveMonth = currentMonth === 0 ? 12 : currentMonth;
    const archiveYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Check if we're running on the 1st of the month
    const isFirstOfMonth = currentDate.getDate() === 1;
    
    if (!isFirstOfMonth) {
      console.log('Not the 1st of the month, skipping archive process');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Archive process only runs on the 1st of each month' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Archiving transactions from ${archiveMonth}/${archiveYear}...`);

    // Get all transactions from previous month
    const startDate = new Date(archiveYear, archiveMonth - 1, 1);
    const endDate = new Date(archiveYear, archiveMonth, 0);
    
    const { data: transactions, error: fetchError } = await supabaseClient
      .from('transactions')
      .select('*')
      .gte('date_transaction', startDate.toISOString().split('T')[0])
      .lte('date_transaction', endDate.toISOString().split('T')[0]);

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      throw fetchError;
    }

    if (!transactions || transactions.length === 0) {
      console.log('No transactions to archive');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No transactions to archive',
          archived_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${transactions.length} transactions to archive`);

    // Create folder structure: year/monthname (e.g., "2025/octobre")
    const monthName = getMonthName(archiveMonth);
    const folderPath = `${archiveYear}/${monthName}${archiveYear}`;
    const fileName = `transactions_${monthName}_${archiveYear}.json`;
    const filePath = `${folderPath}/${fileName}`;

    // Create JSON file content
    const fileContent = JSON.stringify({
      archive_date: currentDate.toISOString(),
      archive_month: archiveMonth,
      archive_year: archiveYear,
      month_name: monthName,
      transaction_count: transactions.length,
      transactions: transactions
    }, null, 2);

    // Upload to storage
    console.log(`Uploading archive file to: ${filePath}`);
    const { error: uploadError } = await supabaseClient.storage
      .from('transaction-archives')
      .upload(filePath, fileContent, {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading archive file:', uploadError);
      throw uploadError;
    }

    console.log('Successfully uploaded archive file to storage');

    // Prepare archive data with file path
    const archiveData = transactions.map(transaction => ({
      original_transaction_id: transaction.id,
      type: transaction.type,
      categorie: transaction.categorie,
      montant: transaction.montant,
      devise: transaction.devise,
      mode_paiement: transaction.mode_paiement,
      description: transaction.description,
      date_transaction: transaction.date_transaction,
      source_type: transaction.source_type,
      source_id: transaction.source_id,
      created_by: transaction.created_by,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
      archive_month: archiveMonth,
      archive_year: archiveYear,
      archive_file_path: filePath
    }));

    // Insert into archive
    const { error: archiveError } = await supabaseClient
      .from('transactions_archive')
      .insert(archiveData);

    if (archiveError) {
      console.error('Error archiving transactions:', archiveError);
      throw archiveError;
    }

    console.log(`Successfully archived ${transactions.length} transactions`);

    // Delete from main table
    const transactionIds = transactions.map(t => t.id);
    const { error: deleteError } = await supabaseClient
      .from('transactions')
      .delete()
      .in('id', transactionIds);

    if (deleteError) {
      console.error('Error deleting archived transactions:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${transactions.length} archived transactions from main table`);

    // Reset all caisses to 0
    const { data: caisses, error: caissesError } = await supabaseClient
      .from('caisses')
      .select('*');

    if (!caissesError && caisses) {
      for (const caisse of caisses) {
        await supabaseClient
          .from('caisses')
          .update({ montants: [] })
          .eq('id', caisse.id);
      }
      console.log('Reset all caisses to 0');
    }

    // Reset all bank accounts to 0
    const { data: comptes, error: comptesError } = await supabaseClient
      .from('comptes_bancaires')
      .select('*');

    if (!comptesError && comptes) {
      for (const compte of comptes) {
        await supabaseClient
          .from('comptes_bancaires')
          .update({ montants: [] })
          .eq('id', compte.id);
      }
      console.log('Reset all bank accounts to 0');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully archived ${transactions.length} transactions from ${monthName} ${archiveYear}`,
        archived_count: transactions.length,
        archive_month: archiveMonth,
        archive_year: archiveYear,
        archive_folder: folderPath,
        archive_file: filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in archive process:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
