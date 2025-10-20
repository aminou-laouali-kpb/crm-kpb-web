import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import kpbLogo from '../../assets/kpb-logo.png';

const Template3 = ({ data }) => {
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
      <div className="bg-white p-8 max-w-4xl mx-auto">
        {/* Header with Logo and Title Side by Side */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-4 border-blue-600">
          <div className="flex items-center gap-4">
            <img src={kpbLogo} alt="KPB Education" className="h-16 w-16" />
            <div>
              <h1 className="text-2xl font-bold text-blue-600">KPB Education</h1>
              <p className="text-sm text-gray-600">Excellence en éducation</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold">FACTURE</h2>
            <p className="text-sm text-gray-600 mt-1">N° {invoice.number}</p>
          </div>
        </div>

        {/* Date and Client Info in Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Date d'émission</p>
            <p className="text-lg font-semibold">{invoice.date}</p>
          </div>
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Facturé à</p>
            <p className="text-lg font-semibold">{clientInfo.firstName} {clientInfo.lastName}</p>
          </div>
        </div>

        {/* Service Details */}
        <div className="mb-8">
          <div className="bg-blue-600 text-white px-4 py-2 font-bold mb-2">
            DÉTAILS DU SERVICE
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-gray-800">{service}</p>
          </div>
        </div>

        {/* Total Amount Box */}
        <div className="mb-8 flex justify-end">
          <div className="w-80 border-2 border-blue-600">
            <div className="bg-blue-600 text-white px-4 py-2">
              <p className="text-sm uppercase">Montant total à régler</p>
            </div>
            <div className="bg-blue-50 px-4 py-6">
              <p className="text-3xl font-bold text-blue-600 text-right">
                {formatCurrency(grandTotal, selectedCurrency)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="mb-6">
          <div className="bg-gray-100 px-4 py-2 font-bold border-l-4 border-blue-600 mb-3">
            INSTRUCTIONS DE PAIEMENT
          </div>
          
          {paymentInfo.type === 'USA' && (
            <div className="pl-4 space-y-2">
              <p className="font-semibold text-blue-600">📍 Paiement aux États-Unis</p>
              <p className="text-sm text-gray-600">Transfert via Moneygram, Western Union ou Ria</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                <div><span className="font-medium">Prénom:</span></div>
                <div>Idriss</div>
                <div><span className="font-medium">Nom:</span></div>
                <div>Laouali Abdou</div>
                <div><span className="font-medium">Adresse:</span></div>
                <div>Bellevue, Seattle, Washington, USA</div>
              </div>
            </div>
          )}

          {paymentInfo.type === 'Niamey' && (
            <div className="pl-4 space-y-2">
              <p className="font-semibold text-blue-600">📍 Paiement à Niamey</p>
              <p className="text-sm text-gray-600">Transfert via Moneygram, Western Union ou Ria</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                <div><span className="font-medium">Prénom:</span></div>
                <div>Judicael Mahoutin</div>
                <div><span className="font-medium">Nom:</span></div>
                <div>Djidonou</div>
                <div><span className="font-medium">Adresse:</span></div>
                <div>Niamey - Niger</div>
              </div>
            </div>
          )}

          {paymentInfo.type === 'France' && (
            <div className="pl-4 space-y-2">
              <p className="font-semibold text-blue-600">🏦 Virement bancaire en France</p>
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="font-medium">Titulaire du compte:</span> Idriss Laouali Abdou</p>
                <p><span className="font-medium">IBAN:</span> FR76 1695 8000 0185 1038 3000 480</p>
                <p><span className="font-medium">BIC/SWIFT:</span> QNTOFRP1XXX</p>
                <p><span className="font-medium">BIC/SWIFT banque correspondante:</span> BNPAFRPP</p>
                <p><span className="font-medium">Adresse titulaire:</span> 8 RUE ANDRE VASSEUR, 31200 TOULOUSE, France</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t text-center text-xs text-gray-500">
          <p>Merci de votre confiance et de votre paiement rapide</p>
          <p className="font-semibold mt-1">KPB Education © 2025 - Tous droits réservés</p>
        </div>
      </div>
    </BaseTemplate>
  );
};

export default Template3;
