import React, { useMemo } from 'react';
import { formatCurrency } from '@/utils/formatCurrency';
import { STATUS_LABELS } from '@/constants/invoiceStatuses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ClientHistoryPanel = ({ invoices, clientEmail, clientWhatsapp }) => {
  const clientInvoices = useMemo(() => {
    if (!clientEmail && !clientWhatsapp) return [];
    return invoices.filter(
      (inv) =>
        (clientEmail && inv.client_email === clientEmail) ||
        (clientWhatsapp && inv.client_whatsapp === clientWhatsapp)
    );
  }, [invoices, clientEmail, clientWhatsapp]);

  const stats = useMemo(() => {
    const total = clientInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const paid = clientInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0);
    const pending = clientInvoices.filter(
      (inv) => inv.status !== 'paid'
    ).length;
    return { total, paid, pending, count: clientInvoices.length };
  }, [clientInvoices]);

  if (clientInvoices.length <= 1) return null;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Historique client ({stats.count} factures)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-semibold">{formatCurrency(stats.total, 'XOF')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Payé</p>
            <p className="font-semibold text-green-600">{formatCurrency(stats.paid, 'XOF')}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">En cours</p>
            <p className="font-semibold text-orange-600">{stats.pending}</p>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {clientInvoices.slice(0, 5).map((inv) => (
            <div
              key={inv.id}
              className="flex justify-between items-center text-xs p-2 rounded bg-muted/50"
            >
              <span className="font-medium">{inv.invoice_number}</span>
              <Badge variant="outline" className="text-[10px]">
                {STATUS_LABELS[inv.status]}
              </Badge>
              <span>{formatCurrency(inv.amount, inv.currency)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientHistoryPanel;
