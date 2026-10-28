import React from 'react';
import { formatCurrency } from '../utils/formatCurrency';

/** Récapitulatif offre / montant à payer / restant affiché sur la facture client. */
const InvoiceAmountSummary = ({ totalOffer, amount, remaining, currency = 'XOF' }) => {
  const offer = Number(totalOffer) || 0;
  if (offer <= 0) return null;
  const rest = remaining != null ? Number(remaining) : Math.max(offer - (Number(amount) || 0), 0);
  const Row = ({ label, value, strong }) => (
    <div className={`flex justify-between py-1 ${strong ? 'font-bold' : ''}`}>
      <span>{label}</span>
      <span>{formatCurrency(value, currency)}</span>
    </div>
  );
  return (
    <div className="mb-4 border-2 border-blue-200 rounded p-3 bg-blue-50 text-sm text-gray-800">
      <Row label="Montant total de l'offre" value={offer} />
      <Row label="Montant à payer (cette facture)" value={Number(amount) || 0} strong />
      <Row label="Montant restant après ce paiement" value={rest} />
    </div>
  );
};

export default InvoiceAmountSummary;
