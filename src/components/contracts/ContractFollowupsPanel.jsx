import { useMemo, useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SendContractDialog from '@/components/contracts/SendContractDialog';
import { useContractFollowups } from '@/hooks/useContracts';
import { contractsToFollowUp, daysSinceLastTouch, getContractState } from '@/utils/contracts';
import { formatCurrency } from '@/utils/formatCurrency';
import { STATUS_LABELS } from '@/constants/invoiceStatuses';

/** Clients qui n'ont pas encore signé leur contrat : envoyer ou relancer en un clic. */
const ContractFollowupsPanel = ({ isAdmin }) => {
  const { data: rows = [], isLoading } = useContractFollowups();
  const [selected, setSelected] = useState(null);
  const followUps = useMemo(() => contractsToFollowUp(rows), [rows]);

  return (
    <section className="space-y-3 mb-8">
      <div>
        <h2 className="font-semibold">Contrats à faire signer ({followUps.length})</h2>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Toutes les factures' : 'Vos factures'} dont le contrat n’est pas encore signé.
          Relancez au moins tous les 2 jours.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && followUps.length === 0 && (
        <p className="text-sm text-emerald-700">Tous les contrats de vos factures sont signés.</p>
      )}

      {followUps.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Facture</th>
                <th className="px-3 py-2">Contrat</th>
                <th className="px-3 py-2">Dernier envoi</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {followUps.map((row) => {
                const state = getContractState(row.contract_state);
                const days = daysSinceLastTouch(row);
                const late = row.contract_state === 'non_envoye' || (days !== null && days >= 2);
                const toSend = ['non_envoye', 'expire'].includes(row.contract_state);
                return (
                  <tr key={row.invoice_id} className={late ? 'bg-amber-50/60' : ''}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{row.client_first_name} {row.client_last_name}</p>
                      <p className="text-xs text-muted-foreground">{row.client_whatsapp}</p>
                      {isAdmin && <p className="text-xs text-muted-foreground">{row.sales_representative}</p>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="font-mono text-xs">{row.invoice_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(row.amount, row.currency)} · {STATUS_LABELS[row.invoice_status] || row.invoice_status}
                      </p>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${state.className}`}>{state.label}</span>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">
                      {row.sent_at ? (
                        <>
                          <p>{days === 0 ? 'Aujourd’hui' : `Il y a ${days} j`}</p>
                          <p className="text-muted-foreground">
                            {row.reminder_count > 0 ? `${row.reminder_count} relance(s)` : 'Aucune relance'}
                          </p>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="sm" variant={toSend ? 'default' : 'outline'} onClick={() => setSelected(row)}>
                        {toSend ? <Send className="h-4 w-4 mr-1" /> : <MessageCircle className="h-4 w-4 mr-1" />}
                        {toSend ? 'Envoyer' : 'Relancer'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <SendContractDialog
        invoice={selected ? { ...selected, id: selected.invoice_id } : null}
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </section>
  );
};

export default ContractFollowupsPanel;
