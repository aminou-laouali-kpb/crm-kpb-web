// Optional: create signing link via edge (staff JWT).
// Primary path in the app creates tokens directly via Supabase client.

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

    const { client_id, engagement_id, days_valid = 14, origin } = await req.json();
    const expires = new Date();
    expires.setDate(expires.getDate() + days_valid);

    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('contract_signing_tokens')
      .insert({
        client_id,
        engagement_id,
        expires_at: expires.toISOString(),
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;

    await supabase
      .from('engagements')
      .update({ status: 'awaiting_signature' })
      .eq('id', engagement_id);

    const base = origin || Deno.env.get('PUBLIC_APP_URL') || '';
    return new Response(
      JSON.stringify({
        token: data.token,
        url: `${base}/sign/${data.token}`,
        expires_at: data.expires_at,
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
