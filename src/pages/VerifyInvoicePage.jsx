import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldCheck, ShieldAlert, Loader2, Search } from 'lucide-react';
import kpbLogo from '@/assets/kpb-logo.png';
import { formatCurrency } from '@/utils/formatCurrency';

const STATUS_LABELS = {
  generated: 'Facture émise',
  sent: 'Facture envoyée au client',
  awaiting_payment: 'En attente de paiement',
  to_follow_up: 'En attente de paiement',
  paid: 'Paiement reçu',
};

const VerifyInvoicePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('n') || '';
  const [value, setValue] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runCheck = useCallback(async (num) => {
    const trimmed = (num || '').trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setResult(null);
    const { data, error: rpcError } = await supabase.rpc('verify_invoice', {
      p_invoice_number: trimmed,
    });
    if (rpcError) {
      setError("La vérification n'a pas pu aboutir. Réessayez dans un instant.");
    } else {
      setResult(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (initial) runCheck(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams(value.trim() ? { n: value.trim() } : {});
    runCheck(value);
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center mb-6">
          <img src={kpbLogo} alt="KPB Education" className="h-20 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Vérification de facture</h1>
          <p className="text-sm text-slate-300 mt-1">
            Confirmez qu'une facture a bien été émise par KPB Education.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 mb-5 space-y-3"
        >
          <label className="text-xs font-semibold text-slate-200 uppercase">
            Numéro de facture
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="KPB-2026-0001"
            className="bg-white text-slate-900"
          />
          <Button type="submit" className="w-full" disabled={loading || !value.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" /> Vérifier
              </>
            )}
          </Button>
        </form>

        {error && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 text-sm text-amber-900">
            {error}
          </div>
        )}

        {result && result.valid && (
          <div className="rounded-xl bg-white p-5 border-l-8 border-emerald-500 shadow-xl">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-700">Facture authentique</p>
                <p className="text-xs text-slate-500">Émise par KPB Education</p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Numéro</dt>
                <dd className="font-semibold text-slate-900">{result.invoice_number}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Date d'émission</dt>
                <dd className="font-semibold text-slate-900">{formatDate(result.invoice_date)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Client</dt>
                <dd className="font-semibold text-slate-900">{result.client_masked}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Service</dt>
                <dd className="font-semibold text-slate-900 text-right">{result.service}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Montant</dt>
                <dd className="font-semibold text-slate-900">
                  {formatCurrency(result.amount, result.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Statut</dt>
                <dd className="font-semibold text-slate-900">
                  {STATUS_LABELS[result.status] || result.status}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {result && !result.valid && (
          <div className="rounded-xl bg-white p-5 border-l-8 border-red-600 shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert className="h-7 w-7 text-red-600" />
              <p className="font-bold text-red-700">Facture introuvable</p>
            </div>
            <p className="text-sm text-slate-600">
              Aucune facture ne correspond à ce numéro dans nos registres. N'effectuez aucun
              paiement et contactez immédiatement KPB Education.
            </p>
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400 mt-6">
          KPB Education — Exigez toujours une facture officielle pour tout paiement.
        </p>
      </div>
    </div>
  );
};

export default VerifyInvoicePage;
