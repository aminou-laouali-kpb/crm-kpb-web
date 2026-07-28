import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const decodeDataUrl = (value: string) => {
  const match = value.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error('Invalid data payload');
  const contentType = match[1];
  const binary = atob(match[2]);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { bytes, contentType };
};

function stripMarkdown(md: string) {
  return String(md || '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\|/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function wrapText(text: string, maxWidth: number, font: any, size: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateContractPdf(params: {
  entityName: string;
  renderedBody: string;
  signerName: string;
  signerEmail: string | null;
  signedAt: string | null;
  contractHash: string | null;
  templateVersion: string | null;
  signatureImage?: string | null;
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([595.28, 841.89]);
  const margin = 40;
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  const addPage = () => {
    page = pdf.addPage([595.28, 841.89]);
    y = page.getHeight() - margin;
  };

  const drawLines = (lines: string[], opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    const size = opts.size || 10;
    const activeFont = opts.bold ? bold : font;
    const lineHeight = size + 4;
    for (const line of lines) {
      if (y < margin + lineHeight) addPage();
      page.drawText(line, {
        x: margin,
        y,
        size,
        font: activeFont,
        color: opts.color || rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  };

  drawLines([`${params.entityName} — Contrat de prestation signé`], { size: 14, bold: true });
  y -= 4;
  drawLines([
    `Version : ${params.templateVersion || ''}`,
    `Signataire : ${params.signerName || ''}${params.signerEmail ? ` <${params.signerEmail}>` : ''}`,
    `Signé le : ${params.signedAt ? new Date(params.signedAt).toLocaleString('fr-FR', { timeZone: 'UTC' }) + ' UTC' : ''}`,
    `Hash SHA-256 : ${params.contractHash || ''}`,
  ], { size: 10 });

  y -= 8;
  drawLines(['Contenu du contrat'], { size: 12, bold: true });

  const paragraphs = stripMarkdown(params.renderedBody).split('\n');
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      y -= 6;
      continue;
    }
    drawLines(wrapText(paragraph.trim(), width, font, 10), { size: 10 });
  }

  y -= 10;
  drawLines(['Preuve de signature électronique'], { size: 12, bold: true });
  drawLines([
    'Le client a coché « Lu et approuvé » et a signé électroniquement via la plateforme KPB.',
  ], { size: 10 });

  if (params.signatureImage?.startsWith('data:image')) {
    try {
      const { bytes, contentType } = decodeDataUrl(params.signatureImage);
      const image = contentType.includes('png')
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const imgWidth = 180;
      const ratio = image.height / image.width || 0.3;
      const imgHeight = imgWidth * ratio;
      if (y < margin + imgHeight) addPage();
      page.drawImage(image, {
        x: margin,
        y: y - imgHeight,
        width: imgWidth,
        height: imgHeight,
      });
      y -= imgHeight + 8;
    } catch {
      // Ignore invalid signature image payloads.
    }
  }

  return await pdf.save();
}

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
    .select('id, signer_name, signer_email, signed_at, pdf_url, template_version, request_id, entity_key, contract_hash, rendered_body, signature_image')
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
      const { signature_id: signatureId, request_id: requestId, pdf_path: pdfPath } = body;
      if (!signatureId) throw new Error('signature_id required');
      if (!pdfPath) throw new Error('pdf_path required');

      const context = await buildSignatureContext(signatureId, requestId);
      const pdfBytes = await generateContractPdf({
        entityName: context.entityName,
        renderedBody: context.signature.rendered_body || '',
        signerName: context.signature.signer_name || '',
        signerEmail: context.signature.signer_email,
        signedAt: context.signature.signed_at,
        contractHash: context.signature.contract_hash,
        templateVersion: context.signature.template_version,
        signatureImage: context.signature.signature_image,
      });

      const { error: uploadError } = await service.storage
        .from('contract-pdfs')
        .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: true });
      if (uploadError) throw uploadError;

      const { error: rpcError } = await service.rpc('attach_signature_pdf', {
        p_signature_id: signatureId,
        p_pdf_url: pdfPath,
      });
      if (rpcError) throw rpcError;

      const pdfSignedUrl = await maybeSignedPdfUrl(pdfPath);
      return new Response(JSON.stringify({ ok: true, pdf_path: pdfPath, pdf_signed_url: pdfSignedUrl }), {
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
        status: 200,
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
