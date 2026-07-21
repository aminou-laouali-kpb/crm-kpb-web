import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { buildContractVars, renderContract } from '@/utils/renderContract';
import { sha256Hex } from '@/utils/contractHash';
import { markdownToHtml } from '@/utils/markdownToHtml';
import { generateContractPdfBlob } from '@/utils/contractPdf';
import { DEFAULT_CONTRACT_CONFIG } from '@/constants/contractConfig';
import kpbLogo from '@/assets/kpb-logo.png';
import { Loader2, CheckCircle2 } from 'lucide-react';

const ContractSignPage = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [context, setContext] = useState(null);
  const [renderedBody, setRenderedBody] = useState('');
  const [readAndAgreed, setReadAndAgreed] = useState(false);
  const [reachedArticle7, setReachedArticle7] = useState(false);
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error: rpcError } = await supabase.rpc('get_signing_context', {
          p_token: token,
        });
        if (rpcError) throw rpcError;
        setContext(data);

        const config = { ...DEFAULT_CONTRACT_CONFIG, ...(data.contract_config || {}) };
        const vars = buildContractVars({
          client: data.client,
          engagement: data.engagement,
          config: {
            ...config,
            version_contrat: data.template?.version || config.version_contrat,
          },
        });
        const body = renderContract(data.template.body_md, vars);
        setRenderedBody(body);
      } catch (e) {
        setError(e.message || 'Impossible de charger le contrat');
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
  }, [token]);

  useEffect(() => {
    if (!renderedBody || !scrollRef.current) return;
    const root = scrollRef.current;
    const target = root.querySelector('#article-7');
    if (!target) {
      // Fallback: enable when scrolled near bottom
      const onScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = root;
        if (scrollTop + clientHeight >= scrollHeight * 0.55) {
          setReachedArticle7(true);
        }
      };
      root.addEventListener('scroll', onScroll);
      return () => root.removeEventListener('scroll', onScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setReachedArticle7(true);
      },
      { root, threshold: 0.2 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [renderedBody]);

  const html = useMemo(() => markdownToHtml(renderedBody), [renderedBody]);
  const canSign = reachedArticle7 && readAndAgreed && !signing;

  const handleSign = async () => {
    if (!canSign) return;
    setSigning(true);
    try {
      const hash = await sha256Hex(renderedBody);
      const { data, error: rpcError } = await supabase.rpc('submit_contract_signature', {
        p_token: token,
        p_contract_hash: hash,
        p_rendered_body: renderedBody,
        p_read_and_agreed: true,
        p_user_agent: navigator.userAgent,
        p_signer_ip: null,
        p_pdf_url: null,
      });
      if (rpcError) throw rpcError;

      // Generate & upload PDF proof
      try {
        const blob = generateContractPdfBlob({
          renderedBody,
          signerName: data.signer_name,
          signerEmail: data.signer_email,
          signedAt: data.signed_at,
          contractHash: hash,
          templateVersion: data.template_version,
        });
        const path = `${context.client.id}/${data.signature_id}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from('contract-pdfs')
          .upload(path, blob, { contentType: 'application/pdf', upsert: true });
        if (!uploadError) {
          await supabase.rpc('attach_signature_pdf', {
            p_signature_id: data.signature_id,
            p_pdf_url: path,
          });
        }
      } catch {
        // PDF upload is best-effort; signature already recorded
      }

      // Best-effort email via edge function
      try {
        await supabase.functions.invoke('sign-contract', {
          body: {
            action: 'send_confirmation',
            signature_id: data.signature_id,
            email: data.signer_email,
            name: data.signer_name,
          },
        });
      } catch {
        // optional
      }

      setDone(data);
      toast.success('Contrat signé avec succès');
    } catch (e) {
      toast.error(e.message || 'Échec de la signature');
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <img src={kpbLogo} alt="KPB" className="h-16 mx-auto" />
          <h1 className="text-xl font-bold">Lien indisponible</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <div className="max-w-md text-center space-y-4 bg-background p-8 rounded-2xl shadow">
          <CheckCircle2 className="h-14 w-14 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">Contrat signé</h1>
          <p className="text-muted-foreground">
            Merci {done.signer_name}. Votre signature a été enregistrée
            le {new Date(done.signed_at).toLocaleString('fr-FR')} (version {done.template_version}).
          </p>
          <p className="text-sm text-muted-foreground">
            Un PDF figé a été archivé. Vous pouvez fermer cette page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="border-b bg-background sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <img src={kpbLogo} alt="KPB Education" className="h-10" />
        <div>
          <p className="font-semibold text-sm">Contrat de prestation</p>
          <p className="text-xs text-muted-foreground">
            {context?.client?.first_name} {context?.client?.last_name} — v{context?.template?.version}
          </p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={{ maxHeight: 'calc(100vh - 180px)' }}
      >
        <article
          className="max-w-3xl mx-auto bg-background p-6 md:p-10 rounded-xl shadow prose prose-sm max-w-none contract-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <footer className="border-t bg-background p-4 space-y-3 sticky bottom-0">
        <div className="max-w-3xl mx-auto space-y-3">
          {!reachedArticle7 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
              Faites défiler jusqu&apos;à l&apos;Article 7 (politique de remboursement) pour activer la signature.
            </p>
          )}
          <div className="flex items-start gap-3">
            <Checkbox
              id="read-agreed"
              checked={readAndAgreed}
              onCheckedChange={(v) => setReadAndAgreed(v === true)}
            />
            <Label htmlFor="read-agreed" className="text-sm leading-snug cursor-pointer">
              Lu et approuvé — Je reconnais avoir lu l&apos;intégralité du contrat, y compris
              l&apos;Article 7 (politique de remboursement), et j&apos;en accepte tous les termes.
            </Label>
          </div>
          <Button
            className="w-full"
            size="lg"
            disabled={!canSign}
            onClick={handleSign}
          >
            {signing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signature en cours...
              </>
            ) : (
              'Signer le contrat'
            )}
          </Button>
        </div>
      </footer>

      <style>{`
        .contract-table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.8rem; }
        .contract-table td { border: 1px solid #ccc; padding: 0.35rem 0.5rem; }
        .contract-content blockquote { border-left: 3px solid #2563eb; padding-left: 1rem; margin: 1rem 0; background: #eff6ff; }
        .contract-content h3 { margin-top: 1.5rem; color: #1e3a8a; }
      `}</style>
    </div>
  );
};

export default ContractSignPage;
