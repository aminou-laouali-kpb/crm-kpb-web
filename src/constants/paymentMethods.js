export const PAYMENT_OPTIONS = [
  {
    id: 'USA',
    label: 'Paiement aux USA',
    icon: '🇺🇸',
    description: 'Via Moneygram/Western Union/Ria',
    details: 'Idriss Laouali Abdou - Bellevue, Seattle, WA',
  },
  {
    id: 'Niamey',
    label: 'Paiement à Niamey',
    icon: '🇳🇪',
    description: 'Via Moneygram/Western Union/Ria',
    details: 'Judicael Mahoutin Djidonou - Niamey, Niger',
  },
  {
    id: 'NiameyAminou',
    label: 'Paiement à Niamey (Aminou)',
    icon: '🇳🇪',
    description: 'Via Moneygram/Western Union/Ria',
    details: 'Aminou Laouali Abdou - +227 78098914',
  },
  {
    id: 'France',
    label: 'Virement bancaire France',
    icon: '🇫🇷',
    description: 'Virement bancaire',
    details: 'IBAN: FR76 1695 8000 0185 1038 3000 480',
  },
  {
    id: 'BOA',
    label: 'Virement bancaire Niger (BOA)',
    icon: '🏦',
    description: 'Bank Of Africa - Niger',
    details: 'Laouali Abdou Aminou - IBAN: NE58 NE03 8010 0100 1614 9100 0788',
  },
  {
    id: 'Maketou',
    label: 'Maketou',
    icon: '📱',
    description: 'Mobile Money (Wave, Orange Money, Airtel, MTN)',
    details: 'Lien de paiement envoyé avec la facture',
  },
  {
    id: 'MyNITA',
    label: 'MyNITA (Niger)',
    icon: '💳',
    description: 'Paiement mobile Niger',
    details: 'Aminou Laouali Abdou - +227 76929799',
  },
  {
    id: 'Wave',
    label: "Wave (Sénégal/Côte d'Ivoire)",
    icon: '🌊',
    description: 'Paiement mobile Wave',
    details: 'Aminou Laouali Abdou - +227 76929799',
  },
  {
    id: 'Especes',
    label: 'Espèces',
    icon: '💵',
    description: 'Paiement en espèces',
    details: 'Contactez votre commercial',
  },
];

export const PAYMENT_FILTER_OPTIONS = [
  { value: 'All', label: 'Toutes les options' },
  ...PAYMENT_OPTIONS.map(({ id, label }) => ({ value: id, label })),
];

export const PAYMENT_CRM_OPTIONS = PAYMENT_OPTIONS.map(({ id, label, icon }) => ({
  id,
  label,
  icon,
}));

export const getPaymentLabel = (id) =>
  PAYMENT_OPTIONS.find((p) => p.id === id)?.label || id;

export const parsePaymentTypes = (paymentType) => {
  if (!paymentType) return [];
  if (Array.isArray(paymentType)) return paymentType;
  return paymentType.split(',').map((t) => t.trim()).filter(Boolean);
};

export const invoiceMatchesPaymentFilter = (invoicePaymentType, filterValue) => {
  if (filterValue === 'all') return true;
  const types = parsePaymentTypes(invoicePaymentType);
  return types.includes(filterValue);
};

export const normalizePaymentTypes = (paymentInfo) => {
  if (paymentInfo?.types?.length) return paymentInfo.types;
  if (paymentInfo?.type === 'All') return ['USA', 'Niamey', 'France'];
  if (paymentInfo?.type) return [paymentInfo.type];
  return ['USA'];
};
