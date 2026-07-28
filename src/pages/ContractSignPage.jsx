import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { buildContractVars, renderContract } from '@/utils/renderContract';
import { sha256Hex } from '@/utils/contractHash';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { generateContractPdfBlob } from '@/utils/contractPdf';
import { DEFAULT_CONTRACT_CONFIG } from '@/constants/contractConfig';
import { getEntity } from '@/config/entities';
import kpbLogo from '@/assets/kpb-logo.png';
import { Loader2, CheckCircle2, Download } from 'lucide-react';

function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = 140;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
  }, []);

  const pos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const src = e.touches?.[0] || e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.clientWidth, 140);
    onChange?.('');
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        className="w-full h-[140px] border border-border rounded-md bg-white touch-none cursor-crosshair"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <Button type="button" variant="outline" size="sm" onClick={clear}>
        Effacer la signature
      </Button>
    </div>
  );
}


function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const ContractSignPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [state, setState] = useState(null);
  const [context, setContext] = useState(null);
  const [renderedBody, setRenderedBody] = useState('');
  const [readAndAgreed, setReadAndAgreed] = useState(false);
  const [reachedArticle7, setReachedArticle7] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState('');
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('referrerpolicy', 'no-referrer');
    const meta = document.createElement('meta');
    meta.name = 'referrer';
    meta.content = 'no-referrer';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // New flow: contract_signature_requests (text token)
        let data = null;
        const primary = await supabase.rpc('get_contract_request_context', {
          p_token: token,
        });

        if (!primary.error && primary.data) {
          data = primary.data;
        } else {
          // Legacy UUID tokens from contract_signing_tokens
          const legacy = await supabase.rpc('get_signing_context', { p_token: token });
          if (legacy.error) {
            await supabase.rpc('log_contract_token_access', {
              p_token_hint: token,
              p_outcome: 'invalid',
              p_user_agent: navigator.userAgent,
            }).catch(() => {});
            throw primary.error || legacy.error;
          }
          const legacyData = legacy.data;
          data = {
            state: 'pending',
            token,
            entity_key: 'kpb_education_ne',
            expires_at: legacyData.expires_at,
            prefill: {
              client: legacyData.client,
              engagement: legacyData.engagement,
              contract_config: legacyData.contract_config,
              entity: getEntity('kpb_education_ne'),
            },
            template: legacyData.template,
            _legacy: true,
          };
        }

        setState(data.state);
        setContext(data);

        if (data.state === 'revoked' || data.state === 'expired') {
          setError(data.message);
          return;
        }

        const prefill = data.prefill || {};
        const entity = {
          ...getEntity(data.entity_key),
          ...(prefill.entity || {}),
        };
        const config = {
          ...DEFAULT_CONTRACT_CONFIG,
          ...(prefill.contract_config || {}),
          version_contrat: data.template?.version || DEFAULT_CONTRACT_CONFIG.version_contrat,
        };
        const vars = buildContractVars({
          client: prefill.client,
          engagement: prefill.engagement,
          config,
          entity,
        });
        const body = renderContract(data.template.body_md, vars);
        setRenderedBody(body);

        const defaultName = `${prefill.client?.first_name || ''} ${prefill.client?.last_name || ''}`.trim();
        setSignerName(defaultName);

        if (data.state === 'signed') {
          setDone(data.signature);
        }
      } catch (e) {
        setError(e.message || 'Impossible de charger le contrat');
        setState('error');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  useEffect(() => {
    if (!renderedBody || !scrollRef.current || state !== 'pending') return;
    const root = scrollRef.current;
    const target = root.querySelector('#article-7');
    if (!target) {
      const onScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = root;
        if (scrollTop + clientHeight >= scrollHeight * 0.55) setReachedArticle7(true);
      };
      root.addEventListener('scroll', onScroll);
      return () => root.removeEventListener('scroll', onScroll);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setReachedArticle7(true);
      },
      { root, threshold: 0.15 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [renderedBody, state]);

  const html = useMemo(() => markdownToHtml(renderedBody), [renderedBody]);
  const clientNom = context?.prefill?.client
    ? `${context.prefill.client.first_name || ''} ${context.prefill.client.last_name || ''}`.trim()
    : '';
  const entityName = getEntity(context?.entity_key)?.legal_name || 'Prestataire';

  const canSign =
    state === 'pending'
    && reachedArticle7
    && readAndAgreed
    && signerName.trim().length > 1
    && !!signatureImage
    && !signing;

  const handleSign = async () => {
    if (!canSign) return;
    setSigning(true);
    try {
      const hash = await sha256Hex(renderedBody);
      let data;

      if (context?._legacy) {
        const { data: legacyData, error: rpcError } = await supabase.rpc('submit_contract_signature', {
          p_token: token,
          p_contract_hash: hash,
          p_rendered_body: renderedBody,
          p_read_and_agreed: true,
          p_user_agent: navigator.userAgent,
          p_signer_ip: null,
          p_pdf_url: null,
        });
        if (rpcError) throw rpcError;
        data = legacyData;
      } else {
        const { data: reqData, error: rpcError } = await supabase.rpc('submit_contract_request_signature', {
          p_token: token,
          p_signer_name: signerName.trim(),
          p_signature_image: signatureImage,
          p_read_and_agreed: true,
          p_rendered_body: renderedBody,
          p_contract_hash: hash,
          p_user_agent: navigator.userAgent,
          p_signer_ip: null,
        });
        if (rpcError) throw rpcError;
        data = reqData;
      }

      let finalized = null;
      try {
        const blob = generateContractPdfBlob({
          renderedBody,
          signerName: data.signer_name || signerName,
          signerEmail: data.signer_email,
          signedAt: data.signed_at,
          contractHash: data.contract_hash || hash,
          templateVersion: data.template_version,
          signatureImage,
          entityName: getEntity(context?.entity_key)?.legal_name,
        });
        const clientId = context.prefill?.client?.id || context.client?.id;
        const pdfBase64 = await blobToDataUrl(blob);
        const { data: finalData } = await supabase.functions.invoke('sign-contract', {
          body: {
            action: 'finalize_signature',
            signature_id: data.signature_id,
            request_id: data.request_id,
            pdf_base64: pdfBase64,
            pdf_path: `${clientId}/${data.signature_id}.pdf`,
          },
        });
        finalized = finalData;
      } catch (pdfError) {
        console.error('Contract PDF finalize failed:', pdfError);
      }

      if (!context?._legacy) {
        try {
          await supabase.functions.invoke('sign-contract', {
            body: {
              action: 'send_confirmation',
              signature_id: data.signature_id,
              request_id: data.request_id,
            },
          });
        } catch (emailError) {
          console.error('Contract confirmation email failed:', emailError);
        }
      }

      setDone({ ...data, pdf_signed_url: finalized?.pdf_signed_url || null });
      setState('signed');
      toast.success('Contrat signé. Une copie vous a été envoyée par e-mail.');
    } catch (e) {
      toast.error(e.message || 'Échec de la signature');
    } finally {
      setSigning(false);
    }
  };

  const handleDownloadSignedPdf = async () => {
    if (context?._legacy) {
      toast.error('Téléchargement non disponible pour cet ancien lien');
      return;
    }

    setDownloadingPdf(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('sign-contract', {
        body: {
          action: 'get_signed_pdf',
          token,
        },
      });
      if (fnError) throw fnError;
      if (!data?.signed_url) throw new Error('PDF indisponible');
      window.open(data.signed_url, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e.message || 'Impossible de télécharger le PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (error && state !== 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center space-y-3">
          <img src={kpbLogo} alt="KPB" className="h-12 mx-auto" />
          <h1 className="text-xl font-semibold">Contrat indisponible</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (done && state === 'signed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-lg text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-600 mx-auto" />
          <h1 className="text-2xl font-semibold">Contrat signé</h1>
          <p className="text-muted-foreground">
            Une copie vous a été envoyée par e-mail.
            {done.signer_name ? ` Signataire : ${done.signer_name}.` : ''}
            {done.signed_at
              ? ` Le ${new Date(done.signed_at).toLocaleString('fr-FR')}.`
              : ''}
          </p>
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handleDownloadSignedPdf} disabled={downloadingPdf}>
              {downloadingPdf ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Téléchargement…</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Télécharger le PDF signé</>
              )}
            </Button>
          </div>
          {renderedBody && (
            <div
              className="text-left prose prose-sm max-w-none max-h-[50vh] overflow-y-auto border rounded-md p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <img src={kpbLogo} alt="KPB" className="h-9" />
        <div>
          <h1 className="text-base font-semibold leading-tight">Contrat de prestation de services</h1>
          <p className="text-xs text-muted-foreground">Préparé pour {clientNom}</p>
        </div>
      </header>

      <div className="px-4 py-3 grid gap-2 md:grid-cols-2 max-w-4xl mx-auto w-full">
        <div className="rounded-md border bg-white p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Client</p>
          <p className="font-medium">{clientNom}</p>
        </div>
        <div className="rounded-md border bg-white p-3 text-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Prestataire</p>
          <p className="font-medium">{entityName}</p>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-40"
      >
        <article
          className="max-w-4xl mx-auto bg-white shadow-sm border rounded-lg p-6 prose prose-sm
            [&_#article-7]:bg-amber-50 [&_#article-7]:border [&_#article-7]:border-amber-200
            [&_#article-7]:rounded-md [&_#article-7]:px-3 [&_#article-7]:py-2"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <footer className="fixed bottom-0 inset-x-0 bg-white border-t shadow-lg p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {!reachedArticle7 && (
            <p className="text-xs text-amber-700">
              Faites défiler jusqu&apos;à l&apos;Article 7 (remboursement) pour activer la signature.
            </p>
          )}
          <div className="flex items-start gap-2">
            <Checkbox
              id="read-agreed"
              checked={readAndAgreed}
              onCheckedChange={(v) => setReadAndAgreed(v === true)}
            />
            <Label htmlFor="read-agreed" className="text-sm leading-snug cursor-pointer">
              <strong>Lu et approuvé.</strong> Je reconnais avoir lu l&apos;intégralité du contrat,
              y compris l&apos;Article 7 relatif au remboursement, et j&apos;en accepte les termes.
            </Label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="signer-name">Nom et prénom</Label>
              <Input
                id="signer-name"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Signature (souris ou doigt)</Label>
              <div className="mt-1">
                <SignaturePad onChange={setSignatureImage} />
              </div>
            </div>
          </div>
          <Button className="w-full md:w-auto" disabled={!canSign} onClick={handleSign}>
            {signing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi…
              </>
            ) : (
              'Envoyer'
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ContractSignPage;
