import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting invoice archiving process...');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const previousYear = currentYear - 1;

    // Check if we're running on January 1st
    const isJanuaryFirst = currentDate.getMonth() === 0 && currentDate.getDate() === 1;
    
    if (!isJanuaryFirst) {
      console.log('Not January 1st, skipping archive process');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Archive process only runs on January 1st' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Archiving invoices from year ${previousYear}...`);

    // Get all invoices from previous year
    const { data: invoices, error: fetchError } = await supabaseClient
      .from('invoices')
      .select('*')
      .like('invoice_number', `%/${previousYear}`);

    if (fetchError) {
      console.error('Error fetching invoices:', fetchError);
      throw fetchError;
    }

    if (!invoices || invoices.length === 0) {
      console.log('No invoices to archive');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No invoices to archive',
          archived_count: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${invoices.length} invoices to archive`);

    // Prepare archive data
    const archiveData = invoices.map(invoice => ({
      original_invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_id: invoice.client_id,
      client_name: invoice.client_name,
      client_whatsapp: invoice.client_whatsapp,
      client_tax_id: invoice.client_tax_id,
      client_email: invoice.client_email,
      services: invoice.services,
      subtotal: invoice.subtotal,
      tva_rate: invoice.tva_rate,
      tva_amount: invoice.tva_amount,
      discount_amount: invoice.discount_amount,
      timbre_fiscal: invoice.timbre_fiscal,
      retenue_source_rate: invoice.retenue_source_rate,
      retenue_source_amount: invoice.retenue_source_amount,
      total_amount: invoice.total_amount,
      currency: invoice.currency,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      fiscal_year: previousYear,
      collection_source_type: invoice.collection_source_type,
      collection_source_id: invoice.collection_source_id,
      flight_departure_date: invoice.flight_departure_date,
      flight_return_date: invoice.flight_return_date,
      flight_departure_city: invoice.flight_departure_city,
      flight_arrival_city: invoice.flight_arrival_city,
      hotel_checkin_date: invoice.hotel_checkin_date,
      hotel_checkout_date: invoice.hotel_checkout_date,
      hotel_name: invoice.hotel_name,
      hotel_city: invoice.hotel_city,
      hotel_room_type: invoice.hotel_room_type,
      flight_traveler_name: invoice.flight_traveler_name,
      hotel_guest_name: invoice.hotel_guest_name,
      payment_mode: invoice.payment_mode,
      notes: invoice.notes
    }));

    // Insert into archive
    const { error: archiveError } = await supabaseClient
      .from('invoices_archive')
      .insert(archiveData);

    if (archiveError) {
      console.error('Error archiving invoices:', archiveError);
      throw archiveError;
    }

    console.log(`Successfully archived ${invoices.length} invoices`);

    // Delete from main table
    const invoiceIds = invoices.map(inv => inv.id);
    const { error: deleteError } = await supabaseClient
      .from('invoices')
      .delete()
      .in('id', invoiceIds);

    if (deleteError) {
      console.error('Error deleting archived invoices:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${invoices.length} archived invoices from main table`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully archived ${invoices.length} invoices from ${previousYear}`,
        archived_count: invoices.length,
        fiscal_year: previousYear
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
