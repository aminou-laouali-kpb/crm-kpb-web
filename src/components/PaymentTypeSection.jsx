import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const PaymentTypeSection = ({ paymentType, handlePaymentTypeChange }) => {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-semibold mb-4">Type de paiement</h2>
      <RadioGroup
        value={paymentType}
        onValueChange={handlePaymentTypeChange}
        className="space-y-3"
      >
        <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:border-blue-500 transition-colors">
          <RadioGroupItem value="All" id="all" className="mt-1" />
          <Label htmlFor="all" className="cursor-pointer flex-1">
            <div className="font-semibold">Tous les modes de paiement</div>
            <div className="text-sm text-gray-600 mt-1">
              Afficher toutes les options de paiement disponibles
            </div>
          </Label>
        </div>

        <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:border-blue-500 transition-colors">
          <RadioGroupItem value="USA" id="usa" className="mt-1" />
          <Label htmlFor="usa" className="cursor-pointer flex-1">
            <div className="font-semibold">Paiement aux USA</div>
            <div className="text-sm text-gray-600 mt-1">
              Via Moneygram/Western Union/Ria<br/>
              Prénom: Idriss, Nom: Laouali Abdou<br/>
              Adresse: Bellevue, Seattle, Washington, USA
            </div>
          </Label>
        </div>
        
        <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:border-blue-500 transition-colors">
          <RadioGroupItem value="Niamey" id="niamey" className="mt-1" />
          <Label htmlFor="niamey" className="cursor-pointer flex-1">
            <div className="font-semibold">Paiement à Niamey</div>
            <div className="text-sm text-gray-600 mt-1">
              Via Moneygram/Western Union/Ria<br/>
              Prénom: Judicael Mahoutin, Nom: Djidonou<br/>
              Adresse: Niamey - Niger
            </div>
          </Label>
        </div>
        
        <div className="flex items-start space-x-3 p-3 border border-gray-200 rounded-md hover:border-blue-500 transition-colors">
          <RadioGroupItem value="France" id="france" className="mt-1" />
          <Label htmlFor="france" className="cursor-pointer flex-1">
            <div className="font-semibold">Paiement en France</div>
            <div className="text-sm text-gray-600 mt-1">
              Via virement bancaire<br/>
              Titulaire: Idriss Laouali Abdou<br/>
              IBAN: FR76 1695 8000 0185 1038 3000 480
            </div>
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
};

export default PaymentTypeSection;
