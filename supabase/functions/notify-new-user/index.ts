import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewUserNotification {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify the JWT and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { email, firstName, lastName, role }: NewUserNotification = await req.json();

    console.log(`New user registration: ${email} (${firstName} ${lastName}) - Role: ${role}`);

    // Send email using Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'Tunisie Consultations <onboarding@resend.dev>',
        to: ['mndfret@gmail.com'],
        subject: 'Nouvelle inscription - Approbation requise',
        html: `
          <h1>Nouvelle demande d'inscription</h1>
          <p>Un nouvel utilisateur s'est inscrit et attend votre approbation :</p>
          <ul>
            <li><strong>Nom complet :</strong> ${firstName} ${lastName}</li>
            <li><strong>Email :</strong> ${email}</li>
            <li><strong>Rôle demandé :</strong> ${role}</li>
          </ul>
          <p>Pour activer ce compte :</p>
          <ol>
            <li>Connectez-vous à <a href="https://supabase.com/dashboard/project/wuulfgekzffpwdxkwwzi/editor">Supabase</a></li>
            <li>Ouvrez la table <strong>profiles</strong></li>
            <li>Trouvez l'utilisateur avec l'email <strong>${email}</strong></li>
            <li>Changez le statut de 'inactive' à 'active'</li>
            <li>Si nécessaire, modifiez le rôle dans la table <strong>user_roles</strong></li>
          </ol>
          <p>Cordialement,<br>Système Tunisie Consultations</p>
        `
      })
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResult)}`);
    }

    console.log("Notification email sent successfully:", emailResult);

    return new Response(JSON.stringify(emailResult), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in notify-new-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
