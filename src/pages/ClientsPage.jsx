import React, { useMemo, useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useCreateEngagement,
  useCreateSigningLink,
} from '@/hooks/useClients';
import { useSalesRepNames } from '@/hooks/useSalesReps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  PROGRAMME_OPTIONS,
  OBJECTIF_OPTIONS,
  PRESTATIONS_ARTICLE_31,
} from '@/constants/contractConfig';
import { DEFAULT_ENTITY_KEY, ENTITY_OPTIONS, getEntity } from '@/config/entities';
import { buildWhatsAppLink } from '@/utils/whatsappUtils';
import { supabase } from '@/integrations/supabase/client';
import { Copy, MessageCircle, Plus, FileSignature, Pencil } from 'lucide-react';

const emptyClient = {
  first_name: '',
  last_name: '',
  email: '',
  whatsapp: '',
  date_naissance: '',
  lieu_naissance: '',
  nationalite: '',
  piece_identite: '',
  adresse: '',
  is_minor: false,
  representant_legal_nom: '',
  representant_legal_lien: '',
};

const emptyEngagement = {
  programme: 'france_ecoles_privees',
  objectif: 'admission_visa',
  etablissements_cibles: '',
  prestations_incluses: [...PRESTATIONS_ARTICLE_31],
  devise: 'XOF',
  prix_total: '',
  frais_inscription: '0',
  echeancier: '30 % à la signature, 40 % au dépôt, 30 % à l\'admission',
  duree_mois: '12',
  sales_rep: '',
  entity_key: DEFAULT_ENTITY_KEY,
};

const ClientsPage = () => {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const createEngagement = useCreateEngagement();
  const createLink = useCreateSigningLink();
  const salesRepNames = useSalesRepNames();

  const [clientDialog, setClientDialog] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm] = useState(emptyClient);
  const [engagementDialog, setEngagementDialog] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [engagementForm, setEngagementForm] = useState(emptyEngagement);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.whatsapp?.includes(q)
    );
  }, [clients, search]);

  const openCreateClient = () => {
    setEditingClient(null);
    setClientForm(emptyClient);
    setClientDialog(true);
  };

  const openEditClient = (client) => {
    setEditingClient(client);
    setClientForm({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      whatsapp: client.whatsapp || '',
      date_naissance: client.date_naissance || '',
      lieu_naissance: client.lieu_naissance || '',
      nationalite: client.nationalite || '',
      piece_identite: client.piece_identite || '',
      adresse: client.adresse || '',
      is_minor: !!client.is_minor,
      representant_legal_nom: client.representant_legal_nom || '',
      representant_legal_lien: client.representant_legal_lien || '',
    });
    setClientDialog(true);
  };

  const saveClient = async () => {
    if (!clientForm.first_name || !clientForm.last_name || !clientForm.email || !clientForm.whatsapp) {
      toast.error('Prénom, nom, email et WhatsApp sont obligatoires');
      return;
    }
    const payload = {
      ...clientForm,
      date_naissance: clientForm.date_naissance || null,
      representant_legal_nom: clientForm.is_minor ? clientForm.representant_legal_nom : null,
      representant_legal_lien: clientForm.is_minor ? clientForm.representant_legal_lien : null,
    };
    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, updates: payload });
    } else {
      await createClient.mutateAsync(payload);
    }
    setClientDialog(false);
  };

  const openEngagement = (client) => {
    setSelectedClient(client);
    setEngagementForm({ ...emptyEngagement, sales_rep: salesRepNames[0] || '' });
    setEngagementDialog(true);
  };

  const saveEngagementAndLink = async () => {
    if (!selectedClient) return;
    if (!engagementForm.prix_total) {
      toast.error('Le prix total est obligatoire');
      return;
    }
    const eng = await createEngagement.mutateAsync({
      client_id: selectedClient.id,
      programme: engagementForm.programme,
      objectif: engagementForm.objectif,
      etablissements_cibles: engagementForm.etablissements_cibles,
      prestations_incluses: engagementForm.prestations_incluses,
      devise: engagementForm.devise,
      prix_total: parseFloat(engagementForm.prix_total),
      frais_inscription: parseFloat(engagementForm.frais_inscription) || 0,
      echeancier: engagementForm.echeancier,
      duree_mois: parseInt(engagementForm.duree_mois) || 12,
      sales_rep: engagementForm.sales_rep || null,
    });

    const entityKey = engagementForm.entity_key || DEFAULT_ENTITY_KEY;
    const entity = getEntity(entityKey);
    const link = await createLink.mutateAsync({
      clientId: selectedClient.id,
      engagementId: eng.id,
      entityKey,
      entity,
    });

    setEngagementDialog(false);
    await navigator.clipboard.writeText(link.url).catch(() => {});
    toast.success('Lien de signature créé et copié');

    const message =
      `Bonjour ${selectedClient.first_name},\n\n` +
      `Veuillez signer votre contrat de prestation via ce lien sécurisé :\n${link.url}\n\n` +
      `Ce lien expire le ${new Date(link.expires_at).toLocaleDateString('fr-FR')}.\n\n` +
      `Cordialement,\n${entity.legal_name}`;
    window.open(buildWhatsAppLink(selectedClient.whatsapp, message), '_blank');
  };

  const resendLink = async (client, engagement, entityKey = DEFAULT_ENTITY_KEY) => {
    const entity = getEntity(entityKey);
    const link = await createLink.mutateAsync({
      clientId: client.id,
      engagementId: engagement.id,
      entityKey,
      entity,
    });
    await navigator.clipboard.writeText(link.url).catch(() => {});
    toast.success('Nouveau lien copié (précédent révoqué)');
    const message =
      `Bonjour ${client.first_name},\n\n` +
      `Lien de signature de votre contrat :\n${link.url}\n\nCordialement,\n${entity.legal_name}`;
    window.open(buildWhatsAppLink(client.whatsapp, message), '_blank');
  };
  const signatureBadge = (client) => {
    const signed = (client.contract_signatures || []).some((s) => s.signed_at);
    if (signed) return <Badge className="bg-green-100 text-green-800">Contrat signé</Badge>;
    const awaiting = (client.engagements || []).some((e) => e.status === 'awaiting_signature');
    if (awaiting) return <Badge className="bg-amber-100 text-amber-800">En attente de signature</Badge>;
    return <Badge variant="outline">Pas de contrat</Badge>;
  };

  const togglePrestation = (label) => {
    setEngagementForm((prev) => {
      const has = prev.prestations_incluses.includes(label);
      return {
        ...prev,
        prestations_incluses: has
          ? prev.prestations_incluses.filter((p) => p !== label)
          : [...prev.prestations_incluses, label],
      };
    });
  };

  return (
    <AppLayout title="Clients & Contrats" subtitle="Signature électronique avant facturation">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={openCreateClient}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau client
        </Button>
      </div>

      {isLoading ? (
        <p>Chargement...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucun client. Créez un client puis générez un engagement / lien de signature.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => {
            const latestEng = (client.engagements || [])
              .slice()
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            const signed = (client.contract_signatures || []).find((s) => s.signed_at);
            return (
              <Card key={client.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">
                        {client.first_name} {client.last_name}
                      </CardTitle>
                      <CardDescription>
                        {client.email} · {client.whatsapp}
                      </CardDescription>
                    </div>
                    {signatureBadge(client)}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEditClient(client)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Éditer
                  </Button>
                  <Button size="sm" onClick={() => openEngagement(client)}>
                    <FileSignature className="h-3.5 w-3.5 mr-1" /> Nouvel engagement + lien
                  </Button>
                  {latestEng && latestEng.status !== 'signed' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => resendLink(client, latestEng)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> Renvoyer le lien
                    </Button>
                  )}
                  {signed?.pdf_url && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        const { data, error } = await supabase.storage
                          .from('contract-pdfs')
                          .createSignedUrl(signed.pdf_url, 120);
                        if (error || !data?.signedUrl) {
                          toast.error('PDF indisponible');
                          return;
                        }
                        window.open(data.signedUrl, '_blank');
                      }}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" /> PDF signé
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Client dialog */}
      <Dialog open={clientDialog} onOpenChange={setClientDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
            <DialogDescription>Identité requise pour le contrat de prestation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Prénom *</Label>
                <Input value={clientForm.first_name} onChange={(e) => setClientForm({ ...clientForm, first_name: e.target.value })} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={clientForm.last_name} onChange={(e) => setClientForm({ ...clientForm, last_name: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={clientForm.email} onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })} />
            </div>
            <div>
              <Label>WhatsApp *</Label>
              <Input value={clientForm.whatsapp} onChange={(e) => setClientForm({ ...clientForm, whatsapp: e.target.value })} placeholder="+227..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date de naissance</Label>
                <Input type="date" value={clientForm.date_naissance} onChange={(e) => setClientForm({ ...clientForm, date_naissance: e.target.value })} />
              </div>
              <div>
                <Label>Lieu de naissance</Label>
                <Input value={clientForm.lieu_naissance} onChange={(e) => setClientForm({ ...clientForm, lieu_naissance: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nationalité</Label>
                <Input value={clientForm.nationalite} onChange={(e) => setClientForm({ ...clientForm, nationalite: e.target.value })} />
              </div>
              <div>
                <Label>N° pièce d&apos;identité</Label>
                <Input value={clientForm.piece_identite} onChange={(e) => setClientForm({ ...clientForm, piece_identite: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Textarea value={clientForm.adresse} onChange={(e) => setClientForm({ ...clientForm, adresse: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_minor"
                checked={clientForm.is_minor}
                onCheckedChange={(v) => setClientForm({ ...clientForm, is_minor: v === true })}
              />
              <Label htmlFor="is_minor">Client mineur</Label>
            </div>
            {clientForm.is_minor && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Représentant légal</Label>
                  <Input value={clientForm.representant_legal_nom} onChange={(e) => setClientForm({ ...clientForm, representant_legal_nom: e.target.value })} />
                </div>
                <div>
                  <Label>Lien (père/mère/...)</Label>
                  <Input value={clientForm.representant_legal_lien} onChange={(e) => setClientForm({ ...clientForm, representant_legal_lien: e.target.value })} />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClientDialog(false)}>Annuler</Button>
            <Button onClick={saveClient}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Engagement dialog */}
      <Dialog open={engagementDialog} onOpenChange={setEngagementDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Engagement — Annexe 1</DialogTitle>
            <DialogDescription>
              {selectedClient?.first_name} {selectedClient?.last_name} — puis envoi du lien de signature
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Entité contractante</Label>
              <Select
                value={engagementForm.entity_key}
                onValueChange={(v) => setEngagementForm({ ...engagementForm, entity_key: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ENTITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Figée dans le snapshot au moment de la génération du lien.
              </p>
            </div>
            <div>
              <Label>Programme</Label>
              <Select value={engagementForm.programme} onValueChange={(v) => setEngagementForm({ ...engagementForm, programme: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROGRAMME_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Objectif</Label>
              <Select value={engagementForm.objectif} onValueChange={(v) => setEngagementForm({ ...engagementForm, objectif: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OBJECTIF_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Établissements cibles</Label>
              <Input value={engagementForm.etablissements_cibles} onChange={(e) => setEngagementForm({ ...engagementForm, etablissements_cibles: e.target.value })} />
            </div>
            <div>
              <Label className="mb-2 block">Prestations incluses (Art. 3.1)</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2">
                {PRESTATIONS_ARTICLE_31.map((p) => (
                  <div key={p} className="flex items-start gap-2">
                    <Checkbox
                      checked={engagementForm.prestations_incluses.includes(p)}
                      onCheckedChange={() => togglePrestation(p)}
                      id={`p-${p}`}
                    />
                    <Label htmlFor={`p-${p}`} className="text-xs font-normal cursor-pointer">{p}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Devise</Label>
                <Select value={engagementForm.devise} onValueChange={(v) => setEngagementForm({ ...engagementForm, devise: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="XOF">XOF</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prix total *</Label>
                <Input type="number" value={engagementForm.prix_total} onChange={(e) => setEngagementForm({ ...engagementForm, prix_total: e.target.value })} />
              </div>
              <div>
                <Label>Frais inscription</Label>
                <Input type="number" value={engagementForm.frais_inscription} onChange={(e) => setEngagementForm({ ...engagementForm, frais_inscription: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Échéancier</Label>
              <Textarea value={engagementForm.echeancier} onChange={(e) => setEngagementForm({ ...engagementForm, echeancier: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Durée (mois)</Label>
                <Input type="number" value={engagementForm.duree_mois} onChange={(e) => setEngagementForm({ ...engagementForm, duree_mois: e.target.value })} />
              </div>
              <div>
                <Label>Commercial</Label>
                <Select value={engagementForm.sales_rep} onValueChange={(v) => setEngagementForm({ ...engagementForm, sales_rep: v })}>
                  <SelectTrigger><SelectValue placeholder="Commercial" /></SelectTrigger>
                  <SelectContent>
                    {salesRepNames.map((n) => (
                      <SelectItem key={n} value={n}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEngagementDialog(false)}>Annuler</Button>
            <Button onClick={saveEngagementAndLink}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Créer et envoyer WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ClientsPage;
