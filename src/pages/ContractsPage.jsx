import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { useContractStatusList, useCreateSigningLink } from '@/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { buildWhatsAppLink } from '@/utils/whatsappUtils';
import { supabase } from '@/integrations/supabase/client';
import { Copy, MessageCircle, RefreshCw, Download, FileSignature } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STATUS_STYLES = {
  'Signé': 'bg-emerald-100 text-emerald-800',
  'En attente': 'bg-amber-100 text-amber-800',
  'Ouvert, non signé': 'bg-sky-100 text-sky-800',
  'Lien expiré': 'bg-red-100 text-red-800',
  'Révoqué': 'bg-slate-200 text-slate-700',
  'Lien non généré': 'bg-slate-100 text-slate-600',
};

const ContractsPage = () => {
  const navigate = useNavigate();
  const { data: rows = [], isLoading, refetch } = useContractStatusList();
  const createLink = useCreateSigningLink();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c = { signed: 0, pending: 0, opened: 0, expired: 0, none: 0 };
    rows.forEach((r) => {
      if (r.statut_lisible === 'Signé') c.signed += 1;
      else if (r.statut_lisible === 'En attente') c.pending += 1;
      else if (r.statut_lisible === 'Ouvert, non signé') c.opened += 1;
      else if (r.statut_lisible === 'Lien expiré') c.expired += 1;
      else c.none += 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.statut_lisible !== statusFilter) return false;
      const q = search.toLowerCase();
      if (!q) return true;
      return (
        r.prenom?.toLowerCase().includes(q)
        || r.nom?.toLowerCase().includes(q)
        || r.email?.toLowerCase().includes(q)
        || r.telephone?.includes(q)
      );
    });
  }, [rows, statusFilter, search]);

  const linkUrl = (token) => (token ? `${window.location.origin}/contrat/${token}` : null);

  const copyLink = async (row) => {
    const url = linkUrl(row.request_token);
    if (!url) {
      toast.error('Aucun lien actif');
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  };

  const relance = (row) => {
    const url = linkUrl(row.request_token);
    if (!url || !row.telephone) {
      toast.error('Lien ou WhatsApp manquant');
      return;
    }
    const message =
      `Bonjour ${row.prenom},\n\n` +
      `Rappel : veuillez signer votre contrat via ce lien sécurisé :\n${url}\n\n` +
      `Cordialement,\nKPB Education`;
    window.open(buildWhatsAppLink(row.telephone, message), '_blank');
  };

  const regenerate = async (row) => {
    if (!row.engagement_id) {
      toast.error('Aucun engagement — créez-en un depuis Clients');
      navigate('/clients');
      return;
    }
    const link = await createLink.mutateAsync({
      clientId: row.client_id,
      engagementId: row.engagement_id,
      entityKey: row.entity_key || 'kpb_education_ne',
    });
    await navigator.clipboard.writeText(link.url).catch(() => {});
    toast.success('Nouveau lien généré (ancien révoqué) et copié');
    refetch();
  };

  const downloadPdf = async (row) => {
    if (!row.pdf_url) {
      toast.error('PDF non disponible');
      return;
    }
    const { data, error } = await supabase.storage
      .from('contract-pdfs')
      .createSignedUrl(row.pdf_url, 300);
    if (error) {
      toast.error('Impossible de télécharger le PDF');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const needsRelance = (row) => {
    if (row.statut_lisible !== 'En attente' && row.statut_lisible !== 'Ouvert, non signé') return false;
    if (!row.link_created_at) return false;
    const ageH = (Date.now() - new Date(row.link_created_at).getTime()) / 36e5;
    return ageH >= 48;
  };

  return (
    <AppLayout title="Contrats" subtitle="Suivi des signatures — en attente / signés / expirés">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Signés</p>
          <p className="text-2xl font-semibold text-emerald-700">{counts.signed}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">En attente</p>
          <p className="text-2xl font-semibold text-amber-700">{counts.pending}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Ouverts non signés</p>
          <p className="text-2xl font-semibold text-sky-700">{counts.opened}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Expirés</p>
          <p className="text-2xl font-semibold text-red-700">{counts.expired}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          placeholder="Rechercher un client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.keys(STATUS_STYLES).map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          <FileSignature className="h-4 w-4 mr-2" />
          Fiches clients
        </Button>
      </div>

      {isLoading ? (
        <p>Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="px-3 py-2 font-medium">Statut</th>
                <th className="px-3 py-2 font-medium">Lien créé</th>
                <th className="px-3 py-2 font-medium">Ouvert</th>
                <th className="px-3 py-2 font-medium">Signé</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.client_id} className="border-t">
                  <td className="px-3 py-3">
                    <div className="font-medium">{row.prenom} {row.nom}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                    <div className="text-xs text-muted-foreground">{row.telephone}</div>
                  </td>
                  <td className="px-3 py-3">
                    <Badge className={STATUS_STYLES[row.statut_lisible] || ''}>
                      {row.statut_lisible}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {row.link_created_at
                      ? new Date(row.link_created_at).toLocaleString('fr-FR')
                      : '—'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {row.opened_at ? new Date(row.opened_at).toLocaleString('fr-FR') : '—'}
                  </td>
                  <td className="px-3 py-3">
                    {row.signed_at ? (
                      <div>
                        <div>{new Date(row.signed_at).toLocaleString('fr-FR')}</div>
                        <div className="text-xs text-muted-foreground">{row.signer_name}</div>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.request_token && row.statut_lisible !== 'Signé' && (
                        <Button size="sm" variant="ghost" onClick={() => copyLink(row)} title="Copier le lien">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {(row.statut_lisible === 'En attente' || row.statut_lisible === 'Ouvert, non signé') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => relance(row)}
                          title={needsRelance(row) ? 'Relancer (48h+)' : 'Relancer WhatsApp'}
                          className={needsRelance(row) ? 'text-amber-700' : ''}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {row.statut_lisible !== 'Signé' && (
                        <Button size="sm" variant="ghost" onClick={() => regenerate(row)} title="Régénérer">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      {row.pdf_url && (
                        <Button size="sm" variant="ghost" onClick={() => downloadPdf(row)} title="PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                    Aucun contrat à afficher
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
};

export default ContractsPage;
