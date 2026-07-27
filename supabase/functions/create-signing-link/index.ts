// Optional Edge Function wrapper around create_signature_request.
// Prefer calling the RPC from the authenticated CRM client.
// Deploy: supabase functions deploy create-signing-link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const body = await req.json();
    const { data, error } = await supabase.rpc('create_signature_request', {
      p_client_id: body.client_id,
      p_engagement_id: body.engagement_id,
      p_entity_key: body.entity_key || 'kpb_education_ne',
      p_entity: body.entity || {},
    });

    if (error) throw error;

    const origin = body.origin || Deno.env.get('APP_ORIGIN') || '';
    return new Response(
      JSON.stringify({
        ...data,
        url: data?.ok ? `${origin}/contrat/${data.token}` : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
