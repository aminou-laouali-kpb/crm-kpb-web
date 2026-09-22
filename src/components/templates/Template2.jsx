import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import PaymentDetailsBlock from '../PaymentDetailsBlock';
import InvoicePaymentWarning from '../InvoicePaymentWarning';
import InvoiceVerificationQR from '../InvoiceVerificationQR';
import kpbLogo from '../../assets/kpb-logo.png';
import kpbStamp from '../../assets/kpb-stamp.png';

const Template2 = ({ data = {} }) => {
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
      <div className="bg-gradient-to-br from-blue-50 to-white p-3 md:p-4 w-full mx-auto">
        {/* Header */}
        <div className="text-center mb-4">
          <img src={kpbLogo} alt="KPB Education" className="h-24 w-24 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-blue-600">KPB Education</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mt-2">FACTURE</h2>
        </div>

        {/* Invoice Details */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
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
            <p className="text-sm text-gray-600">{clientInfo.email}</p>
            <p className="text-sm text-gray-600">{clientInfo.whatsapp}</p>
            <p className="text-sm text-gray-600">Commercial: {salesRep}</p>
          </div>
        </div>

        {/* Service Section */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold text-blue-600 mb-3">Service fourni</h3>
          <p className="text-gray-700 bg-blue-50 p-4 rounded">{service}</p>
        </div>

        {/* Amount */}
        <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-lg">Montant à payer</span>
            <span className="text-3xl font-bold">{formatCurrency(grandTotal, selectedCurrency)}</span>
          </div>
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-bold text-blue-600 mb-2">Modalités de paiement</h3>
          <div className="bg-gray-50 p-3 rounded border-l-4 border-blue-600">
            <PaymentDetailsBlock paymentInfo={paymentInfo} />
          </div>
        </div>

        <div className="mt-4">
          <InvoicePaymentWarning />
        </div>

        {/* Footer */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <div className="flex items-center justify-center gap-6 mb-2 flex-wrap">
            <img src={kpbStamp} alt="Cachet KPB Education" className="h-24" />
            <InvoiceVerificationQR invoiceNumber={invoice.number} />
          </div>
          <p>Merci pour votre confiance</p>
          <p className="font-semibold">KPB Education - Votre partenaire éducatif</p>
          <p className="text-xs mt-2">SIRET: 851 365 908 00025 - 8 Rue André Vasseur, 31200 Toulouse</p>
        </div>

      </div>
    </BaseTemplate>
  );
};

export default Template2;
