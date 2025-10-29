import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import kpbLogo from '../../assets/kpb-logo.png';
import kpbStamp from '../../assets/kpb-stamp.png';

const Template1 = ({ data = {} }) => {
  const { 
    clientInfo = { firstName: '', lastName: '', email: '', whatsapp: '' }, 
    invoice = { date: '', number: '' }, 
    service = '', 
    paymentInfo = { type: 'USA' }, 
    salesRep = '',
    selectedCurrency = 'XOF',
    grandTotal = 0
  } = data;

  return (
    <BaseTemplate data={data}>
      <div className="bg-white p-8 max-w-4xl mx-auto">
        {/* Header with Logo and Company Info */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-blue-600 pb-4">
          <div>
            <img src={kpbLogo} alt="KPB Education" className="h-24 mb-2" />
            <p className="text-xs text-gray-600">SIRET: 851 365 908 00025</p>
            <p className="text-xs text-gray-600">8 Rue André Vasseur</p>
            <p className="text-xs text-gray-600">31200 Toulouse, France</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-blue-600">FACTURE</h2>
            <p className="text-sm text-gray-600">KPB Education</p>
          </div>
        </div>

        {/* Invoice Info */}
        <div className="mb-8">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="font-semibold">Numéro de facture:</p>
              <p className="text-gray-700">{invoice.number}</p>
            </div>
            <div>
              <p className="font-semibold">Date:</p>
              <p className="text-gray-700">{invoice.date}</p>
            </div>
          </div>
        </div>

        {/* Client Information */}
        <div className="mb-8 bg-blue-50 p-4 rounded">
          <h3 className="font-bold text-blue-600 mb-2">INFORMATIONS CLIENT</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><span className="font-semibold">Nom:</span> {clientInfo.firstName} {clientInfo.lastName}</p>
              <p><span className="font-semibold">Email:</span> {clientInfo.email}</p>
            </div>
            <div>
              <p><span className="font-semibold">WhatsApp:</span> {clientInfo.whatsapp}</p>
              <p><span className="font-semibold">Commercial:</span> {salesRep}</p>
            </div>
          </div>
        </div>

        {/* Service */}
        <div className="mb-8">
          <h3 className="font-bold text-blue-600 mb-2">SERVICE</h3>
          <div className="border border-gray-300 p-4 rounded">
            <p className="text-gray-700">{service}</p>
          </div>
        </div>

        {/* Total */}
        <div className="mb-8 bg-blue-600 text-white p-4 rounded">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">MONTANT TOTAL:</span>
            <span className="text-2xl font-bold">{formatCurrency(grandTotal, selectedCurrency)}</span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mb-8">
          <h3 className="font-bold text-blue-600 mb-4">INFORMATIONS DE PAIEMENT</h3>
          <div className="border-2 border-blue-200 p-4 rounded bg-blue-50 space-y-4">
            {(paymentInfo.type === 'USA' || paymentInfo.type === 'All') && (
              <div>
                <p className="font-semibold mb-2">Paiement aux USA via Moneygram/Western Union/Ria:</p>
                <p><strong>Prénom:</strong> Idriss</p>
                <p><strong>Nom:</strong> Laouali Abdou</p>
                <p><strong>Adresse:</strong> Bellevue, Seattle, Washington, USA</p>
              </div>
            )}
            {(paymentInfo.type === 'Niamey' || paymentInfo.type === 'All') && (
              <div className={paymentInfo.type === 'All' ? 'pt-4 border-t border-blue-300' : ''}>
                <p className="font-semibold mb-2">Paiement à Niamey via Moneygram/Western Union/Ria:</p>
                <p><strong>Prénom:</strong> Judicael Mahoutin</p>
                <p><strong>Nom:</strong> Djidonou</p>
                <p><strong>Adresse:</strong> Niamey - Niger</p>
              </div>
            )}
            {(paymentInfo.type === 'France' || paymentInfo.type === 'All') && (
              <div className={paymentInfo.type === 'All' ? 'pt-4 border-t border-blue-300' : ''}>
                <p className="font-semibold mb-2">Paiement en France via Virement bancaire:</p>
                <p><strong>Prénom:</strong> Idriss</p>
                <p><strong>Nom:</strong> Laouali Abdou</p>
                <p><strong>IBAN:</strong> FR76 1695 8000 0185 1038 3000 480</p>
                <p><strong>BIC/SWIFT:</strong> QNTOFRP1XXX</p>
                <p><strong>BIC/SWIFT banque correspondante:</strong> BNPAFRPP</p>
                <p><strong>Adresse du titulaire:</strong> 8 RUE ANDRE VASSEUR, 31200 TOULOUSE, France</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 border-t pt-4">
          <div className="flex justify-center mb-4">
            <img src={kpbStamp} alt="Cachet KPB Education" className="h-32" />
          </div>
          <p>Merci de votre confiance - KPB Education</p>
          <p className="text-xs mt-2">SIRET: 851 365 908 00025 - 8 Rue André Vasseur, 31200 Toulouse, France</p>
        </div>
      </div>
    </BaseTemplate>
  );
};

export default Template1;
