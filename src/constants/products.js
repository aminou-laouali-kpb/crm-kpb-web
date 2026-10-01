/**
 * Produits digitaux vendus en plus des prestations classiques.
 * La commission du guide est fixe et ne passe pas par le taux de 10 %.
 */
export const GUIDE_ULTIME = {
  productCode: 'guide_ultime',
  label: 'Guide ultime du boursier africain',
  buttonLabel: 'Guide ultime',
  price: 9000,
  currency: 'XOF',
  commission: 1000,
};

export const isGuideUltime = (invoice) =>
  invoice?.product_code === GUIDE_ULTIME.productCode;
