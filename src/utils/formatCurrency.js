export const formatCurrency = (amount, currencyCode = 'XOF', minimumFractionDigits = 2) => {
  let locale = 'fr-FR';
  if (currencyCode === 'USD') locale = 'en-US';
  else if (currencyCode === 'EUR') locale = 'fr-FR';
  else if (currencyCode === 'XOF') locale = 'fr-FR';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currencyCode, minimumFractionDigits }).format(amount);
};

export const getCurrencySymbol = (currencyCode) => {
  return formatCurrency(0, currencyCode).replace(/[\d.,\s]/g, '');
};
