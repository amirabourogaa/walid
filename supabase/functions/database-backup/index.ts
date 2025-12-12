import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, backupData } = await req.json();

    if (action === 'backup') {
      console.log('Starting complete backup with files...');
      
      // Fetch all tables data
      const tables = [
        'profiles',
        'user_roles',
        'employees',
        'clients',
        'client_folders',
        'client_activity_log',
        'client_assignments',
        'applications',
        'appointments',
        'appointment_reminders',
        'invoices',
        'invoices_history',
        'invoices_archive',
        'transactions',
        'transactions_history',
        'transactions_archive',
        'caisses',
        'caisses_archive',
        'caisses_daily_history',
        'comptes_bancaires',
        'comptes_bancaires_archive',
        'employee_notifications',
        'whatsapp_message_history',
        'whatsapp_files',
        'push_subscriptions'
      ];

      const backup: Record<string, any[]> = {};
      
      for (const table of tables) {
        const { data, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          backup[table] = [];
        } else {
          backup[table] = data || [];
        }
      }

      // Fetch and download all storage files
      const storageFiles: Record<string, Array<{
        name: string;
        path: string;
        content: string; // base64 encoded
        contentType: string;
      }>> = {};
      
      const buckets = ['client-files', 'transaction-archives'];
      let totalFilesCount = 0;
      
      for (const bucket of buckets) {
        storageFiles[bucket] = [];
        
        // List all files in bucket (including subfolders)
        const { data: files, error: listError } = await supabase.storage
          .from(bucket)
          .list('', { limit: 10000 });
        
        if (listError) {
          console.error(`Error listing ${bucket}:`, listError);
          continue;
        }

        if (!files) continue;

        // Process files and folders
        for (const item of files) {
          if (item.id) {
            // It's a file at root level
            await downloadFile(supabase, bucket, item.name, storageFiles[bucket]);
            totalFilesCount++;
          } else {
            // It's a folder, list its contents
            const { data: folderFiles } = await supabase.storage
              .from(bucket)
              .list(item.name, { limit: 10000 });
            
            if (folderFiles) {
              for (const file of folderFiles) {
                if (file.id) {
                  const filePath = `${item.name}/${file.name}`;
                  await downloadFile(supabase, bucket, filePath, storageFiles[bucket]);
                  totalFilesCount++;
                }
              }
            }
          }
        }
        
        console.log(`Bucket ${bucket}: ${storageFiles[bucket].length} files downloaded`);
      }

      const backupResult = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        tables: backup,
        storageFiles,
        metadata: {
          totalRecords: Object.values(backup).reduce((acc, arr) => acc + arr.length, 0),
          tablesCount: tables.length,
          totalFilesCount,
          bucketsCount: buckets.length
        }
      };

      console.log(`Backup complete: ${backupResult.metadata.totalRecords} records, ${totalFilesCount} files`);

      return new Response(
        JSON.stringify({ success: true, backup: backupResult }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'restore') {
      if (!backupData || !backupData.tables) {
        return new Response(
          JSON.stringify({ success: false, error: 'بيانات النسخة الاحتياطية غير صالحة' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Starting complete restore with files...');

      const restoreOrder = [
        'profiles',
        'user_roles', 
        'employees',
        'clients',
        'client_folders',
        'client_activity_log',
        'client_assignments',
        'applications',
        'appointments',
        'appointment_reminders',
        'caisses',
        'caisses_archive',
        'caisses_daily_history',
        'comptes_bancaires',
        'comptes_bancaires_archive',
        'invoices',
        'invoices_history',
        'invoices_archive',
        'transactions',
        'transactions_history',
        'transactions_archive',
        'employee_notifications',
        'whatsapp_message_history',
        'whatsapp_files',
        'push_subscriptions'
      ];

      const results: Record<string, { success: boolean; count: number; error?: string }> = {};

      // Restore database tables
      for (const table of restoreOrder) {
        const tableData = backupData.tables[table];
        if (!tableData || tableData.length === 0) {
          results[table] = { success: true, count: 0 };
          continue;
        }

        try {
          // Delete existing data first
          const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

          if (deleteError) {
            console.error(`Error deleting ${table}:`, deleteError);
          }

          // Insert backup data in batches
          const batchSize = 100;
          let insertedCount = 0;

          for (let i = 0; i < tableData.length; i += batchSize) {
            const batch = tableData.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from(table)
              .upsert(batch, { onConflict: 'id' });

            if (insertError) {
              console.error(`Error inserting ${table}:`, insertError);
              results[table] = { success: false, count: insertedCount, error: insertError.message };
              break;
            }
            insertedCount += batch.length;
          }

          if (!results[table]) {
            results[table] = { success: true, count: insertedCount };
          }
        } catch (error) {
          console.error(`Error restoring ${table}:`, error);
          results[table] = { success: false, count: 0, error: String(error) };
        }
      }

      // Restore storage files
      const fileResults: Record<string, { restored: number; errors: number }> = {};
      
      if (backupData.storageFiles) {
        for (const [bucket, files] of Object.entries(backupData.storageFiles as Record<string, any[]>)) {
          fileResults[bucket] = { restored: 0, errors: 0 };
          
          for (const file of files) {
            try {
              // Decode base64 content
              const binaryContent = Uint8Array.from(atob(file.content), c => c.charCodeAt(0));
              
              // Upload file to storage
              const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(file.path, binaryContent, {
                  contentType: file.contentType || 'application/octet-stream',
                  upsert: true
                });

              if (uploadError) {
                console.error(`Error uploading ${file.path}:`, uploadError);
                fileResults[bucket].errors++;
              } else {
                fileResults[bucket].restored++;
              }
            } catch (error) {
              console.error(`Error processing file ${file.path}:`, error);
              fileResults[bucket].errors++;
            }
          }
          
          console.log(`Bucket ${bucket}: ${fileResults[bucket].restored} files restored, ${fileResults[bucket].errors} errors`);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          results,
          fileResults,
          message: 'تمت استعادة البيانات والملفات بنجاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'إجراء غير معروف' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );

  } catch (error) {
    console.error('Backup/Restore error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// Helper function to download a file and add it to the array
async function downloadFile(
  supabase: any,
  bucket: string,
  filePath: string,
  filesArray: Array<{ name: string; path: string; content: string; contentType: string }>
) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error(`Error downloading ${filePath}:`, error);
      return;
    }

    if (data) {
      // Convert blob to base64
      const arrayBuffer = await data.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Content = btoa(binary);
      
      filesArray.push({
        name: filePath.split('/').pop() || filePath,
        path: filePath,
        content: base64Content,
        contentType: data.type || 'application/octet-stream'
      });
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}
