export const INVOICE_STATUSES = [
  'generated',
  'sent',
  'awaiting_payment',
  'to_follow_up',
  'paid',
];

export const STATUS_LABELS = {
  generated: 'Facture générée',
  sent: 'Facture envoyée',
  awaiting_payment: 'En attente de paiement',
  to_follow_up: 'À relancer',
  paid: 'Facture payée',
};

export const STATUS_COLORS = {
  generated: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  awaiting_payment: 'bg-yellow-100 text-yellow-800',
  to_follow_up: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
};

export const STATUS_ORDER = INVOICE_STATUSES;
