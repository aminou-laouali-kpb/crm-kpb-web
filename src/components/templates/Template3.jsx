import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
import PaymentDetailsBlock from '../PaymentDetailsBlock';
import kpbLogo from '../../assets/kpb-logo.png';
import kpbStamp from '../../assets/kpb-stamp.png';

const Template3 = ({ data = {} }) => {
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
        {/* Header with Logo and Title Side by Side */}
        <div className="flex items-start justify-between mb-4 pb-3 border-b-4 border-blue-600">
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Date d'émission</p>
            <p className="text-lg font-semibold">{invoice.date}</p>
          </div>
          <div className="border-l-4 border-blue-600 pl-4">
            <p className="text-xs text-gray-500 uppercase mb-1">Facturé à</p>
            <p className="text-lg font-semibold">{clientInfo.firstName} {clientInfo.lastName}</p>
            <p className="text-xs text-gray-600">{clientInfo.email}</p>
            <p className="text-xs text-gray-600">{clientInfo.whatsapp}</p>
            <p className="text-xs text-gray-600">Commercial: {salesRep}</p>
          </div>
        </div>

        {/* Service Details */}
        <div className="mb-4">
          <div className="bg-blue-600 text-white px-4 py-2 font-bold mb-2">
            DÉTAILS DU SERVICE
          </div>
          <div className="border border-gray-300 p-4">
            <p className="text-gray-800">{service}</p>
          </div>
        </div>

        {/* Total Amount Box */}
        <div className="mb-4 flex justify-end">
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
        <div className="mb-4">
          <div className="bg-gray-100 px-3 py-1.5 font-bold border-l-4 border-blue-600 mb-2">
            INSTRUCTIONS DE PAIEMENT
          </div>
          <div className="pl-3">
            <PaymentDetailsBlock paymentInfo={paymentInfo} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t text-center text-xs text-gray-500">
          <div className="flex justify-center mb-2">
            <img src={kpbStamp} alt="Cachet KPB Education" className="h-24" />
          </div>
          <p>Merci de votre confiance et de votre paiement rapide</p>
          <p className="font-semibold mt-1">KPB Education © 2025 - Tous droits réservés</p>
          <p className="mt-2">SIRET: 851 365 908 00025 - 8 Rue André Vasseur, 31200 Toulouse</p>
        </div>
      </div>
    </BaseTemplate>
  );
};

export default Template3;
