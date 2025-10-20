import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import kpbLogo from '../../assets/kpb-logo.png';

const Template2 = ({ data }) => {
  const { 
    clientInfo, 
    invoice, 
    service, 
    paymentInfo, 
    selectedCurrency,
    grandTotal 
  } = data;

  return (
    <BaseTemplate data={data}>
      <div className="bg-gradient-to-br from-blue-50 to-white p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={kpbLogo} alt="KPB Education" className="h-24 w-24 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-blue-600">KPB Education</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-2">FACTURE</h2>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600">Numéro de facture</p>
              <p className="text-lg font-bold text-blue-600">{invoice.number}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Date d'émission</p>
              <p className="text-lg font-bold">{invoice.date}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-1">Client</p>
            <p className="text-xl font-semibold">{clientInfo.firstName} {clientInfo.lastName}</p>
          </div>
        </div>

        {/* Service Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-bold text-blue-600 mb-3">Service fourni</h3>
          <p className="text-gray-700 bg-blue-50 p-4 rounded">{service}</p>
        </div>

        {/* Amount */}
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg">Montant à payer</span>
            <span className="text-3xl font-bold">{formatCurrency(grandTotal, selectedCurrency)}</span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold text-blue-600 mb-4">Modalités de paiement</h3>
          <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-600">
            {paymentInfo.type === 'USA' && (
              <div className="space-y-1">
                <p className="font-semibold text-blue-600">💳 Paiement aux USA</p>
                <p className="text-sm">Via Moneygram / Western Union / Ria</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Prénom:</span> Idriss</p>
                  <p><span className="font-medium">Nom:</span> Laouali Abdou</p>
                  <p><span className="font-medium">Adresse:</span> Bellevue, Seattle, Washington, USA</p>
                </div>
              </div>
            )}
            {paymentInfo.type === 'Niamey' && (
              <div className="space-y-1">
                <p className="font-semibold text-blue-600">💳 Paiement à Niamey</p>
                <p className="text-sm">Via Moneygram / Western Union / Ria</p>
                <div className="mt-2 space-y-1">
                  <p><span className="font-medium">Prénom:</span> Judicael Mahoutin</p>
                  <p><span className="font-medium">Nom:</span> Djidonou</p>
                  <p><span className="font-medium">Adresse:</span> Niamey - Niger</p>
                </div>
              </div>
            )}
            {paymentInfo.type === 'France' && (
              <div className="space-y-1">
                <p className="font-semibold text-blue-600">🏦 Virement bancaire en France</p>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="font-medium">Titulaire:</span> Idriss Laouali Abdou</p>
                  <p><span className="font-medium">IBAN:</span> FR76 1695 8000 0185 1038 3000 480</p>
                  <p><span className="font-medium">BIC/SWIFT:</span> QNTOFRP1XXX</p>
                  <p><span className="font-medium">BIC/SWIFT correspondante:</span> BNPAFRPP</p>
                  <p><span className="font-medium">Adresse:</span> 8 RUE ANDRE VASSEUR, 31200 TOULOUSE, France</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Merci pour votre confiance</p>
          <p className="font-semibold">KPB Education - Votre partenaire éducatif</p>
        </div>
      </div>
    </BaseTemplate>
  );
};

export default Template2;
