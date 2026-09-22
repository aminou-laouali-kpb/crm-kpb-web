import React from 'react';

/**
 * Avertissement rouge obligatoire affiché sur chaque facture émise.
 */
const InvoicePaymentWarning = ({ compact = false }) => {
  return (
    <div
      className="mb-4 rounded border-2 border-red-600 bg-red-50 px-3 py-2"
      style={{ borderColor: '#dc2626', backgroundColor: '#fef2f2' }}
    >
      <p
        className={`font-bold uppercase tracking-wide ${compact ? 'text-[11px]' : 'text-xs'}`}
        style={{ color: '#b91c1c' }}
      >
        ⚠ Important — Exigez toujours une facture
      </p>
      <p
        className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold leading-snug mt-1`}
        style={{ color: '#dc2626' }}
      >
        Pour tout paiement effectué à KPB Education, exigez systématiquement une facture ou un reçu
        officiel. Aucun versement ne doit être fait sans document officiel vérifiable.
      </p>
    </div>
  );
};

export default InvoicePaymentWarning;
