import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { createHmac } from "node:crypto";

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "your_verify_token_here";
const APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppWebhookMessage {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages: Array<{
    from: string;
    id: string;
    timestamp: string;
    type: string;
    [key: string]: any;
  }>;
}

// Verify webhook signature from Meta
function verifySignature(body: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) {
    console.error('Missing signature or APP_SECRET');
    return false;
  }

  try {
    const expectedSignature = 'sha256=' + createHmac('sha256', APP_SECRET)
      .update(body)
      .digest('hex');

    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle webhook verification (GET request from Meta)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    console.log("Webhook verification request:", { mode, token });

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully");
      return new Response(challenge, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // Handle webhook events (POST request from Meta)
  if (req.method === "POST") {
    try {
      // Get the raw body for signature verification
      const bodyText = await req.text();
      const signature = req.headers.get('x-hub-signature-256');

      // Verify webhook signature
      if (!verifySignature(bodyText, signature)) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const body = JSON.parse(bodyText);
      console.log("Received webhook:", JSON.stringify(body, null, 2));

      // Process webhook data
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === "messages") {
              const messageData: WhatsAppWebhookMessage = change.value;
              
              // Process each message
              for (const message of messageData.messages || []) {
                console.log("Processing message:", message);

                // Get sender info
                const fromNumber = message.from;
                const contact = messageData.contacts?.find(c => c.wa_id === fromNumber);
                const senderName = contact?.profile?.name || "Unknown";

                // Handle different message types
                if (message.type === "image" || message.type === "document") {
                  console.log(`Received ${message.type} from ${senderName} (${fromNumber})`);
                  
                  // Here you would:
                  // 1. Download the media file using WhatsApp Business API
                  // 2. Upload to Supabase Storage
                  // 3. Extract data if it's a PDF
                  // 4. Process image if it contains faces
                  // 5. Store metadata in database
                  
                  // For now, just log the event
                  console.log("Media file details:", {
                    type: message.type,
                    from: fromNumber,
                    sender: senderName,
                    timestamp: message.timestamp,
                  });
                }
              }
            }
          }
        }
      }

      // Always return 200 OK to acknowledge receipt
      return new Response(
        JSON.stringify({ success: true, message: "Webhook processed" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error processing webhook:", error);
      
      // Still return 200 to prevent Meta from retrying
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("Method not allowed", { 
    status: 405, 
    headers: corsHeaders 
  });
};

serve(handler);
