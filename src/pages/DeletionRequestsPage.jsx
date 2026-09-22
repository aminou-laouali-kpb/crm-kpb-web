import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { formatCurrency } from '@/utils/formatCurrency';
import { Check, X, Loader2, ShieldAlert } from 'lucide-react';

const STATUS_BADGE = {
  pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: 'Approuvée', className: 'bg-green-100 text-green-800' },
  rejected: { label: 'Refusée', className: 'bg-red-100 text-red-800' },
  cancelled: { label: 'Annulée', className: 'bg-gray-100 text-gray-800' },
};

const DeletionRequestsPage = () => {
  const { isAdmin, loading: roleLoading } = useAdminCheck();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invoice_deletion_requests')
      .select('*')
      .order('requested_at', { ascending: false });
    if (error) {
      toast.error('Impossible de charger les demandes');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const review = async (id, approve) => {
    setBusyId(id);
    const { error } = await supabase.rpc('review_invoice_deletion', {
      p_request_id: id,
      p_approve: approve,
      p_note: notes[id]?.trim() || null,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message || 'Action impossible');
      return;
    }
    toast.success(approve ? 'Facture supprimée' : 'Demande refusée');
    fetchRequests();
  };

  const pending = requests.filter((r) => r.status === 'pending');
  const history = requests.filter((r) => r.status !== 'pending');

  const renderCard = (req) => {
    const snap = req.invoice_snapshot || {};
    const badge = STATUS_BADGE[req.status] || STATUS_BADGE.pending;
    return (
      <Card key={req.id}>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">{req.invoice_number}</p>
              <p className="text-sm text-muted-foreground">
                {snap.client} · {snap.service}
              </p>
            </div>
            <Badge className={badge.className}>{badge.label}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Montant</p>
              <p className="font-medium">{formatCurrency(snap.amount || 0, snap.currency || 'XOF')}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Commercial</p>
              <p className="font-medium">{snap.sales_representative || '—'}</p>
            </div>
          </div>
          <div className="text-sm">
            <p className="text-muted-foreground text-xs">Motif</p>
            <p>{req.reason}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Demandée le {new Date(req.requested_at).toLocaleString('fr-FR')}
          </p>
          {req.review_note && (
            <p className="text-xs text-muted-foreground">Note : {req.review_note}</p>
          )}
          {req.status === 'pending' && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor={`note-${req.id}`} className="text-xs">Note (optionnelle)</Label>
              <Input
                id={`note-${req.id}`}
                value={notes[req.id] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                placeholder="Commentaire de décision"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={busyId === req.id}
                  onClick={() => review(req.id, true)}
                >
                  {busyId === req.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Approuver et supprimer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === req.id}
                  onClick={() => review(req.id, false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!roleLoading && !isAdmin) {
    return (
      <AppLayout title="Suppressions">
        <div className="text-center py-16 text-muted-foreground">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3" />
          Seul l'administrateur peut consulter cette page.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Demandes de suppression"
      subtitle="Validez ou refusez la suppression des factures"
    >
      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">En attente ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune demande en attente.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">{pending.map(renderCard)}</div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold">Historique ({history.length})</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun historique.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">{history.map(renderCard)}</div>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
};

export default DeletionRequestsPage;
