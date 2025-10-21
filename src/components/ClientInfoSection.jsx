import React from 'react';
import FloatingLabelInput from './FloatingLabelInput';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const ClientInfoSection = ({ clientInfo, handleInputChange, selectedCurrency, setSelectedCurrency }) => {
  return (
    <div className="mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Devise de paiement</h3>
        <RadioGroup
          value={selectedCurrency}
          onValueChange={setSelectedCurrency}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="XOF" id="xof" />
            <Label htmlFor="xof">Francs CFA (XOF)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="EUR" id="eur" />
            <Label htmlFor="eur">Euros (€)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="USD" id="usd" />
            <Label htmlFor="usd">Dollars ($)</Label>
          </div>
        </RadioGroup>
      </div>
      
      <h2 className="text-2xl font-semibold mb-4">Informations du client</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FloatingLabelInput
          id="clientFirstName"
          label="Prénom"
          value={clientInfo.firstName}
          onChange={handleInputChange}
          name="firstName"
        />
        <FloatingLabelInput
          id="clientLastName"
          label="Nom"
          value={clientInfo.lastName}
          onChange={handleInputChange}
          name="lastName"
        />
        <FloatingLabelInput
          id="clientEmail"
          label="Email"
          type="email"
          value={clientInfo.email}
          onChange={handleInputChange}
          name="email"
        />
        <FloatingLabelInput
          id="clientWhatsapp"
          label="Numéro WhatsApp"
          type="tel"
          value={clientInfo.whatsapp}
          onChange={handleInputChange}
          name="whatsapp"
        />
      </div>
    </div>
  );
};

export default ClientInfoSection;
