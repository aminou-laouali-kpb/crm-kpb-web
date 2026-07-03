import React from 'react';
import BaseTemplate from './BaseTemplate';
import { formatCurrency } from '../../utils/formatCurrency';
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
          
          <div className="space-y-2">
            {(() => {
              const types = paymentInfo.types || (paymentInfo.type === 'All' ? ['USA', 'Niamey', 'France'] : [paymentInfo.type]);
              const showSeparator = (index) => index > 0 ? 'pl-3 space-y-1 pt-2 border-t border-gray-300' : 'pl-3 space-y-1';
              let itemIndex = 0;
              
              return (
                <>
                  {types.includes('USA') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🇺🇸 Paiement aux États-Unis</p>
                      <p className="text-xs text-gray-600">Transfert via Moneygram, Western Union ou Ria</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs">
                        <div><span className="font-medium">Prénom:</span></div>
                        <div>Idriss</div>
                        <div><span className="font-medium">Nom:</span></div>
                        <div>Laouali Abdou</div>
                        <div><span className="font-medium">Adresse:</span></div>
                        <div>Bellevue, Seattle, Washington, USA</div>
                      </div>
                    </div>
                  )}
                  {types.includes('Niamey') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🇳🇪 Paiement à Niamey</p>
                      <p className="text-xs text-gray-600">Transfert via Moneygram, Western Union ou Ria</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs">
                        <div><span className="font-medium">Prénom:</span></div>
                        <div>Judicael Mahoutin</div>
                        <div><span className="font-medium">Nom:</span></div>
                        <div>Djidonou</div>
                        <div><span className="font-medium">Adresse:</span></div>
                        <div>Niamey - Niger</div>
                      </div>
                    </div>
                  )}
                  {types.includes('NiameyAminou') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🇳🇪 Paiement à Niamey (Aminou)</p>
                      <p className="text-xs text-gray-600">Transfert via Moneygram, Western Union ou Ria</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs">
                        <div><span className="font-medium">Prénom:</span></div>
                        <div>Aminou</div>
                        <div><span className="font-medium">Nom:</span></div>
                        <div>Laouali Abdou</div>
                        <div><span className="font-medium">Téléphone:</span></div>
                        <div>+227 78098914</div>
                        <div><span className="font-medium">Adresse:</span></div>
                        <div>Niamey - Niger</div>
                      </div>
                    </div>
                  )}
                  {types.includes('France') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🇫🇷 Virement bancaire en France</p>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p><span className="font-medium">Titulaire du compte:</span> Idriss Laouali Abdou</p>
                        <p><span className="font-medium">IBAN:</span> FR76 1695 8000 0185 1038 3000 480</p>
                        <p><span className="font-medium">BIC/SWIFT:</span> QNTOFRP1XXX</p>
                        <p><span className="font-medium">BIC/SWIFT banque correspondante:</span> BNPAFRPP</p>
                        <p><span className="font-medium">Adresse titulaire:</span> 8 RUE ANDRE VASSEUR, 31200 TOULOUSE, France</p>
                      </div>
                    </div>
                  )}
                  {types.includes('BOA') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🏦 Virement bancaire au Niger (Bank Of Africa)</p>
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p><span className="font-medium">Banque:</span> Bank Of Africa - Niger</p>
                        <p><span className="font-medium">Titulaire du compte:</span> Laouali Abdou Aminou</p>
                        <p><span className="font-medium">IBAN:</span> NE58 NE03 8010 0100 1614 9100 0788</p>
                        <p><span className="font-medium">BIC/SWIFT:</span> AFRINENIXXX</p>
                        <p><span className="font-medium">RIB:</span> NE038 01001 001614910007 88</p>
                        <p><span className="font-medium">Domiciliation:</span> Niamey - Bobiel, Commune I</p>
                      </div>
                    </div>
                  )}
                  {types.includes('Maketou') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">📱 Maketou - Mobile Money</p>
                      <p className="text-xs text-gray-600">Wave, Orange Money, Airtel Money, MTN Money</p>
                      <p className="text-xs mt-1"><span className="font-medium">Un lien de paiement vous sera envoyé par email/WhatsApp</span></p>
                    </div>
                  )}
                  {types.includes('MyNITA') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">💳 MyNITA (Niger)</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs">
                        <div><span className="font-medium">Prénom:</span></div>
                        <div>Aminou</div>
                        <div><span className="font-medium">Nom:</span></div>
                        <div>Laouali Abdou</div>
                        <div><span className="font-medium">Téléphone:</span></div>
                        <div>+227 76929799</div>
                      </div>
                    </div>
                  )}
                  {types.includes('Wave') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">🌊 Wave (Sénégal/Côte d'Ivoire)</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1 text-xs">
                        <div><span className="font-medium">Prénom:</span></div>
                        <div>Aminou</div>
                        <div><span className="font-medium">Nom:</span></div>
                        <div>Laouali Abdou</div>
                        <div><span className="font-medium">Téléphone:</span></div>
                        <div>+227 76929799</div>
                      </div>
                    </div>
                  )}
                  {types.includes('Especes') && (
                    <div className={showSeparator(itemIndex++)}>
                      <p className="font-semibold text-blue-600 text-xs">💵 Paiement en espèces</p>
                      <p className="text-xs text-gray-600">Contactez votre commercial pour organiser le paiement</p>
                    </div>
                  )}
                </>
              );
            })()}
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
