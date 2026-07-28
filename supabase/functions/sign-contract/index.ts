import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const decodeDataUrl = (value: string) => {
  const match = value.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid PDF payload');
  const contentType = match[1];
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, contentType };
};

async function getCommercialEmail(userId?: string | null) {
  if (!userId) return null;
  try {
    const { data, error } = await service.auth.admin.getUserById(userId);
    if (error) throw error;
    return data.user?.email || null;
  } catch {
    return null;
  }
}

async function buildSignatureContext(signatureId: string, requestId?: string | null) {
  const { data: signature, error: sigError } = await service
    .from('contract_signatures')
    .select('id, signer_name, signer_email, signed_at, pdf_url, template_version, request_id, entity_key')
    .eq('id', signatureId)
    .single();
  if (sigError) throw sigError;

  let request = null;
  const resolvedRequestId = requestId || signature.request_id;
  if (resolvedRequestId) {
    const { data, error } = await service
      .from('contract_signature_requests')
      .select('id, token, created_by, prefill, entity_key')
      .eq('id', resolvedRequestId)
      .maybeSingle();
    if (error) throw error;
    request = data;
  }

  const entityName = request?.prefill?.entity?.legal_name || 'KPB Education';
  return { signature, request, entityName };
}

async function maybeSignedPdfUrl(pdfPath?: string | null) {
  if (!pdfPath) return null;
  const { data, error } = await service.storage
    .from('contract-pdfs')
    .createSignedUrl(pdfPath, 60 * 60 * 24);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

async function sendEmails({ signature, request, entityName }: Awaited<ReturnType<typeof buildSignatureContext>>) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM') || `${entityName} <onboarding@resend.dev>`;
  if (!apiKey) {
    return { ok: false, reason: 'RESEND_API_KEY missing' };
  }

  const signerEmail = signature.signer_email;
  const commercialEmail = await getCommercialEmail(request?.created_by);
  const pdfUrl = await maybeSignedPdfUrl(signature.pdf_url);

  const recipients = [signerEmail, commercialEmail].filter(Boolean);
  if (!recipients.length) return { ok: false, reason: 'No recipients' };

  const html = `
<p>Bonjour,</p>
<p>Le contrat de prestation <strong>${entityName}</strong> a bien été signé électroniquement.</p>
<p><strong>Signataire :</strong> ${signature.signer_name || ''}<br/>
<strong>Signé le :</strong> ${signature.signed_at ? new Date(signature.signed_at).toLocaleString('fr-FR', { timeZone: 'UTC' }) + ' UTC' : ''}<br/>
<strong>Version :</strong> ${signature.template_version}</p>
${pdfUrl ? `<p><a href="${pdfUrl}">Télécharger le PDF signé</a></p>` : '<p>Le PDF signé est en cours d’archivage.</p>'}
<p>Cordialement,<br/>${entityName}</p>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `Confirmation de signature — Contrat ${entityName}`,
      html,
    }),
  });

  const result = await res.json();
  return { ok: res.ok, result, pdf_signed_url: pdfUrl };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action;

    if (action === 'finalize_signature') {
      const { signature_id: signatureId, request_id: requestId, pdf_base64: pdfBase64, pdf_path: pdfPath } = body;
      if (!signatureId) throw new Error('signature_id required');

      let uploadedPath = null;
      if (pdfBase64 && pdfPath) {
        const { bytes, contentType } = decodeDataUrl(pdfBase64);
        const { error: uploadError } = await service.storage
          .from('contract-pdfs')
          .upload(pdfPath, bytes, { contentType, upsert: true });
        if (uploadError) throw uploadError;
        uploadedPath = pdfPath;
        const { error: rpcError } = await service.rpc('attach_signature_pdf', {
          p_signature_id: signatureId,
          p_pdf_url: uploadedPath,
        });
        if (rpcError) throw rpcError;
      }

      const context = await buildSignatureContext(signatureId, requestId);
      const pdfSignedUrl = await maybeSignedPdfUrl(uploadedPath || context.signature.pdf_url);
      return new Response(JSON.stringify({ ok: true, pdf_path: uploadedPath, pdf_signed_url: pdfSignedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_signed_pdf') {
      const token = body.token;
      if (!token) throw new Error('token required');

      const { data: pdfPath, error } = await service.rpc('get_public_contract_pdf_path', {
        p_token: token,
      });
      if (error) throw error;

      const signedUrl = await maybeSignedPdfUrl(pdfPath);
      if (!signedUrl) throw new Error('PDF indisponible');

      return new Response(JSON.stringify({ ok: true, signed_url: signedUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'send_confirmation') {
      const signatureId = body.signature_id;
      if (!signatureId) {
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'signature_id missing' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const context = await buildSignatureContext(signatureId, body.request_id);
      const result = await sendEmails(context);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.ok ? 200 : 200,
      });
    }

    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
