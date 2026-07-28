// Optional Edge Function: email confirmation after signature (Resend).
// Deploy with: supabase functions deploy sign-contract
// Secrets: RESEND_API_KEY, RESEND_FROM (e.g. "KPB Education <noreply@domain>")

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    if (body.action !== 'send_confirmation') {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    const from = Deno.env.get('RESEND_FROM') || 'KPB Education <onboarding@resend.dev>';
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, reason: 'RESEND_API_KEY missing' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [body.email],
        subject: 'Confirmation de signature — Contrat KPB Education',
        html: `<p>Bonjour ${body.name || ''},</p>
<p>Votre contrat de prestation KPB Education a bien été signé électroniquement.</p>
<p>Conservez cet e-mail comme preuve. Le PDF figé est archivé par KPB Education.</p>
<p>Cordialement,<br/>KPB Education</p>`,
      }),
    });

    const result = await res.json();
    return new Response(JSON.stringify({ ok: res.ok, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 500,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
