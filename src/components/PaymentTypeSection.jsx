import React from 'react';
import { toast } from 'sonner';
import { PAYMENT_OPTIONS } from '@/constants/paymentMethods';

const ensureArray = (value) => (Array.isArray(value) ? value : []);

/**
 * Payment selector — plain buttons (no Radix Checkbox).
 * Nested checkbox + row onClick caused double-toggles and Safari crashes.
 */
const PaymentTypeSection = ({ selectedPayments, handlePaymentToggle }) => {
  const selected = ensureArray(selectedPayments);

  const handleToggle = (paymentId) => {
    const current = ensureArray(selectedPayments);
    const isSelected = current.includes(paymentId);

    if (isSelected) {
      if (current.length <= 1) {
        toast.warning('Vous devez sélectionner au moins 1 moyen de paiement');
        return;
      }
      handlePaymentToggle(current.filter((p) => p !== paymentId));
      return;
    }

    if (current.length >= 3) {
      toast.warning('Maximum 3 moyens de paiement autorisés');
      return;
    }
    handlePaymentToggle([...current, paymentId]);
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-2xl font-semibold">Moyens de paiement</h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary whitespace-nowrap">
          {selected.length}/3 sélectionnés
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sélectionnez jusqu&apos;à 3 moyens de paiement à afficher sur la facture
      </p>
      <div className="space-y-3" role="group" aria-label="Moyens de paiement">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleToggle(option.id)}
              aria-pressed={isSelected}
              className={`w-full text-left flex items-start gap-3 p-3 border rounded-md transition-colors tap-highlight ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-primary'
                }`}
              >
                {isSelected ? '✓' : ''}
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-semibold flex items-center gap-2">
                  <span aria-hidden="true">{option.icon}</span>
                  <span>{option.label}</span>
                </span>
                <span className="block text-sm text-muted-foreground mt-1">
                  {option.description}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {option.details}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentTypeSection;
