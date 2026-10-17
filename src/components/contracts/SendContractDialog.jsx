import { useEffect, useState } from 'react';
import { Copy, Loader2, MessageCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLogContractReminder, useSendInvoiceContract } from '@/hooks/useContracts';
import { buildWhatsAppLink } from '@/utils/whatsappUtils';
import { buildContractMessage } from '@/utils/contracts';

/**
 * Envoi du contrat en un clic : récupère (ou crée) le lien de signature de la
 * facture, puis l'envoie par WhatsApp. Renvoyer garde le même lien.
 */
const SendContractDialog = ({ invoice, open, onOpenChange }) => {
  const send = useSendInvoiceContract();
  const logReminder = useLogContractReminder();
  const [link, setLink] = useState(null);
  const [error, setError] = useState(null);

  const load = async (forceNew = false) => {
    setError(null);
    try {
      setLink(await send.mutateAsync({ invoiceId: invoice.id, forceNew }));
      if (forceNew) toast.success('Nouveau lien créé — l’ancien ne fonctionne plus');
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (open && invoice?.id) {
      setLink(null);
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id]);

  if (!invoice) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success('Lien copié');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const sendWhatsApp = () => {
    if (!invoice.client_whatsapp) {
      toast.error('Numéro WhatsApp du client manquant');
      return;
    }
    const message = buildContractMessage({ firstName: invoice.client_first_name, url: link.url, reminder: link.reused });
    window.open(buildWhatsAppLink(invoice.client_whatsapp, message), '_blank');
    if (link.reused && link.requestId) logReminder.mutate(link.requestId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Contrat à signer</DialogTitle>
          <DialogDescription>
            {invoice.client_first_name} {invoice.client_last_name}
            {invoice.invoice_number ? ` · facture ${invoice.invoice_number}` : ''}
          </DialogDescription>
        </DialogHeader>

        {send.isPending && !link && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Préparation du lien…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {link && (
          <div className="space-y-4">
            <p className="text-sm">
              {link.reused
                ? 'Le contrat a déjà été envoyé : c’est le même lien, le client peut toujours l’utiliser.'
                : 'Lien créé. Le client lit le contrat, accepte la politique de remboursement, signe et valide.'}
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link.url} onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" onClick={copy} title="Copier le lien">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sendWhatsApp} className="bg-emerald-600 hover:bg-emerald-700">
                <MessageCircle className="h-4 w-4 mr-2" />
                {link.reused ? 'Relancer par WhatsApp' : 'Envoyer par WhatsApp'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => load(true)} disabled={send.isPending}>
                <RefreshCw className="h-4 w-4 mr-1" /> Nouveau lien
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              « Nouveau lien » seulement si la facture a changé (montant, service) : l’ancien lien sera désactivé.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SendContractDialog;
