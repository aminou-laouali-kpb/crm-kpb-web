import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import PaymentDetailsBlock from '../PaymentDetailsBlock';
import InvoicePaymentWarning from '../InvoicePaymentWarning';
import InvoiceVerificationQR from '../InvoiceVerificationQR';
import kpbLogo from '../../assets/kpb-logo.png';
import kpbStamp from '../../assets/kpb-stamp.png';

const Template1 = ({ data = {} }) => {
  const { 
    clientInfo = { firstName: '', lastName: '', email: '', whatsapp: '' }, 
    invoice = { date: '', number: '' }, 
    service = '', 
    paymentInfo = { type: 'USA' }, 
    // Support both old format (type: 'USA') and new format (types: ['USA', 'Wave'])
    salesRep = '',
    selectedCurrency = 'XOF',
    grandTotal = 0
  } = data;

  return (
    <BaseTemplate data={data}>
      <div className="bg-white p-3 md:p-4 w-full mx-auto">
        {/* Header with Logo and Company Info */}
        <div className="flex justify-between items-start mb-4 border-b-2 border-blue-600 pb-3">
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
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3">
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
        <div className="mb-4 bg-blue-50 p-3 rounded">
          <h3 className="font-bold text-blue-600 mb-2">INFORMATIONS CLIENT</h3>
          <div className="grid grid-cols-2 gap-3">
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
        <div className="mb-4">
          <h3 className="font-bold text-blue-600 mb-2">SERVICE</h3>
          <div className="border border-gray-300 p-3 rounded">
            <p className="text-gray-700">{service}</p>
          </div>
        </div>

        {/* Total */}
        <div className="mb-4 bg-blue-600 text-white p-3 rounded">
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold">MONTANT TOTAL:</span>
            <span className="text-2xl font-bold">{formatCurrency(grandTotal, selectedCurrency)}</span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="mb-4">
          <h3 className="font-bold text-blue-600 mb-2">INFORMATIONS DE PAIEMENT</h3>
          <div className="border-2 border-blue-200 p-3 rounded bg-blue-50">
            <PaymentDetailsBlock paymentInfo={paymentInfo} />
          </div>
        </div>

        <InvoicePaymentWarning />

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-600 border-t pt-3">
          <div className="flex items-center justify-center gap-6 mb-2 flex-wrap">
            <img src={kpbStamp} alt="Cachet KPB Education" className="h-24" />
            <InvoiceVerificationQR invoiceNumber={invoice.number} />
          </div>
          <p>Merci de votre confiance - KPB Education</p>
          <p className="text-xs mt-2">SIRET: 851 365 908 00025 - 8 Rue André Vasseur, 31200 Toulouse, France</p>
        </div>

      </div>
    </BaseTemplate>
  );
};

export default Template1;
