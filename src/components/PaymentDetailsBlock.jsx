import React from 'react';
import { normalizePaymentTypes } from '@/constants/paymentMethods';

const PAYMENT_TEMPLATE_BLOCKS = {
  USA: {
    title: '🇺🇸 Paiement aux USA via Moneygram/Western Union/Ria:',
    lines: [
      ['Prénom', 'Idriss'],
      ['Nom', 'Laouali Abdou'],
      ['Adresse', 'Bellevue, Seattle, Washington, USA'],
    ],
  },
  Niamey: {
    title: '🇳🇪 Paiement à Niamey via Moneygram/Western Union/Ria:',
    lines: [
      ['Prénom', 'Judicael Mahoutin'],
      ['Nom', 'Djidonou'],
      ['Adresse', 'Niamey - Niger'],
    ],
  },
  NiameyAminou: {
    title: '🇳🇪 Paiement à Niamey (Aminou) via Moneygram/Western Union/Ria:',
    lines: [
      ['Prénom', 'Aminou'],
      ['Nom', 'Laouali Abdou'],
      ['Téléphone', '+227 78098914'],
      ['Adresse', 'Niamey - Niger'],
    ],
  },
  France: {
    title: '🇫🇷 Paiement en France via Virement bancaire:',
    lines: [
      ['Titulaire', 'Idriss Laouali Abdou'],
      ['IBAN', 'FR76 1695 8000 0185 1038 3000 480'],
      ['BIC/SWIFT', 'QNTOFRP1XXX'],
      ['BIC/SWIFT banque correspondante', 'BNPAFRPP'],
      ['Adresse du titulaire', '8 RUE ANDRE VASSEUR, 31200 TOULOUSE, France'],
    ],
  },
  BOA: {
    title: '🏦 Virement bancaire au Niger (Bank Of Africa):',
    lines: [
      ['Banque', 'Bank Of Africa - Niger'],
      ['Titulaire', 'Laouali Abdou Aminou'],
      ['IBAN', 'NE58 NE03 8010 0100 1614 9100 0788'],
      ['BIC/SWIFT', 'AFRINENIXXX'],
      ['RIB', 'NE038 01001 001614910007 88'],
      ['Domiciliation', 'Niamey - Bobiel, Commune I'],
    ],
  },
  Maroc: {
    title: '🇲🇦 Paiement par virement bancaire au Maroc:',
    lines: [
      ['Banque', 'CIH'],
      ['Titulaire du compte', 'MONSIEUR LAOUALI ABDOU AMINOU'],
      ['Numéro de compte', '2807468211006100'],
      ['RIB', '230 810 2807468211006100 17'],
      ['IBAN', 'MA64 2308 1028 0746 8211 0061 0017'],
      ['Code SWIFT', 'CIHMMAMC'],
    ],
  },
  Maketou: {
    title: '📱 Maketou - Mobile Money:',
    lines: [
      ['', 'Wave, Orange Money, Airtel Money, MTN Money'],
      ['', 'Un lien de paiement vous sera envoyé par email/WhatsApp'],
    ],
  },
  MyNITA: {
    title: '💳 MyNITA (Niger):',
    lines: [
      ['Prénom', 'Aminou'],
      ['Nom', 'Laouali Abdou'],
      ['Téléphone', '+227 76929799'],
    ],
  },
  Wave: {
    title: "🌊 Wave (Sénégal/Côte d'Ivoire):",
    lines: [
      ['Prénom', 'Aminou'],
      ['Nom', 'Laouali Abdou'],
      ['Téléphone', '+227 76929799'],
    ],
  },
  Especes: {
    title: '💵 Paiement en espèces:',
    lines: [['', 'Contactez votre commercial pour organiser le paiement']],
  },
};

const PaymentDetailsBlock = ({ paymentInfo, className = '', textSize = 'text-xs' }) => {
  const types = normalizePaymentTypes(paymentInfo);

  return (
    <div className={`space-y-2 ${className}`}>
      {types.map((typeId, index) => {
        const block = PAYMENT_TEMPLATE_BLOCKS[typeId];
        if (!block) return null;
        return (
          <div
            key={typeId}
            className={index > 0 ? 'pt-2 border-t border-blue-300' : ''}
          >
            <p className={`font-semibold mb-1 ${textSize}`}>{block.title}</p>
            {block.lines.map(([label, value], i) => (
              <p key={i} className={textSize}>
                {label ? (
                  <>
                    <strong>{label}:</strong> {value}
                  </>
                ) : (
                  value
                )}
              </p>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default PaymentDetailsBlock;
