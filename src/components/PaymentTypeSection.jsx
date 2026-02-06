import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const PAYMENT_OPTIONS = [
  { 
    id: 'USA', 
    label: 'Paiement aux USA', 
    icon: '🇺🇸',
    description: 'Via Moneygram/Western Union/Ria',
    details: 'Idriss Laouali Abdou - Bellevue, Seattle, WA'
  },
  { 
    id: 'Niamey', 
    label: 'Paiement à Niamey', 
    icon: '🇳🇪',
    description: 'Via Moneygram/Western Union/Ria',
    details: 'Judicael Mahoutin Djidonou - Niamey, Niger'
  },
  { 
    id: 'France', 
    label: 'Virement bancaire France', 
    icon: '🇫🇷',
    description: 'Virement bancaire',
    details: 'IBAN: FR76 1695 8000 0185 1038 3000 480'
  },
  { 
    id: 'Maketou', 
    label: 'Maketou', 
    icon: '📱',
    description: 'Mobile Money (Wave, Orange Money, Airtel, MTN)',
    details: 'Lien de paiement envoyé avec la facture'
  },
  { 
    id: 'MyNITA', 
    label: 'MyNITA (Niger)', 
    icon: '💳',
    description: 'Paiement mobile Niger',
    details: 'Aminou Laouali Abdou - +227 76929799'
  },
  { 
    id: 'Wave', 
    label: 'Wave (Sénégal/Côte d\'Ivoire)', 
    icon: '🌊',
    description: 'Paiement mobile Wave',
    details: 'Aminou Laouali Abdou - +227 76929799'
  },
  { 
    id: 'Especes', 
    label: 'Espèces', 
    icon: '💵',
    description: 'Paiement en espèces',
    details: 'Contactez votre commercial'
  }
];

const PaymentTypeSection = ({ selectedPayments, handlePaymentToggle }) => {
  const handleToggle = (paymentId) => {
    if (selectedPayments.includes(paymentId)) {
      // Déselection (minimum 1)
      if (selectedPayments.length === 1) {
        toast.warning("Vous devez sélectionner au moins 1 moyen de paiement");
        return;
      }
      handlePaymentToggle(selectedPayments.filter(p => p !== paymentId));
    } else {
      // Selection (maximum 3)
      if (selectedPayments.length >= 3) {
        toast.warning("Maximum 3 moyens de paiement autorisés");
        return;
      }
      handlePaymentToggle([...selectedPayments, paymentId]);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Moyens de paiement</h2>
        <span className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
          {selectedPayments.length}/3 sélectionnés
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Sélectionnez jusqu'à 3 moyens de paiement à afficher sur la facture
      </p>
      <div className="space-y-3">
        {PAYMENT_OPTIONS.map((option) => {
          const isSelected = selectedPayments.includes(option.id);
          return (
            <div
              key={option.id}
              onClick={() => handleToggle(option.id)}
              className={`flex items-start space-x-3 p-3 border rounded-md cursor-pointer transition-colors ${
                isSelected 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
            >
            <Checkbox
              id={option.id}
              checked={isSelected}
              onCheckedChange={() => handleToggle(option.id)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
              <Label htmlFor={option.id} className="cursor-pointer flex-1">
                <div className="font-semibold flex items-center gap-2">
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {option.description}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {option.details}
                </div>
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentTypeSection;
