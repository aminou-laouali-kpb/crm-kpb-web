import ExcelJS from 'exceljs';
import { periodFileSlug } from './reportPeriod';

const money = (value) => Math.round(Number(value) || 0);

/**
 * Classeur du rapport commercial : une feuille de synthèse pour toute la période.
 */
export const buildCommercialWorkbook = ({
  periodLabel,
  overall,
  months,
  payments,
  services,
  salesReps,
}) => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'KPB Education';

  const summary = wb.addWorksheet('Résumé');
  summary.columns = [{ width: 28 }, { width: 22 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 14 }];
  summary.addRow([`Rapport KPB Education — ${periodLabel}`]);
  summary.addRow([]);
  summary.addRow(['Factures créées', overall.totalInvoices]);
  summary.addRow(['Montant créé (XOF)', money(overall.totalAmount)]);
  summary.addRow(['Factures payées', overall.paidInvoices]);
  summary.addRow(['Encaissé (XOF)', money(overall.paidAmount)]);
  summary.addRow(['Taux de conversion (%)', Number(overall.conversionRate.toFixed(1))]);

  const monthly = wb.addWorksheet('Mensuel');
  monthly.columns = [
    { width: 22 }, { width: 18 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 16 },
  ];
  monthly.addRow(['Mois', 'Factures créées', 'Montant créé (XOF)', 'Factures payées', 'Encaissé (XOF)', 'Taux (%)']);
  months.forEach((month) => {
    monthly.addRow([
      month.label,
      month.totalInvoices,
      money(month.totalAmount),
      month.paidInvoices,
      money(month.paidAmount),
      Number(month.conversionRate.toFixed(1)),
    ]);
  });
  monthly.addRow([
    'Total',
    overall.totalInvoices,
    money(overall.totalAmount),
    overall.paidInvoices,
    money(overall.paidAmount),
    Number(overall.conversionRate.toFixed(1)),
  ]);

  const modes = wb.addWorksheet('Paiements');
  modes.columns = [{ width: 22 }, { width: 14 }, { width: 18 }, { width: 12 }];
  modes.addRow(['Mode', 'Factures', 'Montant (XOF)', 'Part (%)']);
  payments.forEach((mode) => {
    modes.addRow([mode.name, mode.count, money(mode.amount), Number(mode.percentage.toFixed(1))]);
  });

  const servicesSheet = wb.addWorksheet('Services');
  servicesSheet.columns = [{ width: 36 }, { width: 14 }, { width: 18 }, { width: 14 }, { width: 18 }];
  servicesSheet.addRow(['Service', 'Factures créées', 'Montant créé (XOF)', 'Payées', 'Encaissé (XOF)']);
  services.forEach((service) => {
    servicesSheet.addRow([
      service.name,
      service.count,
      money(service.totalAmount),
      service.paidCount,
      money(service.paidAmount),
    ]);
  });

  const reps = wb.addWorksheet('Commerciaux');
  reps.columns = [
    { width: 18 }, { width: 14 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 12 },
  ];
  reps.addRow(['Commercial', 'Factures', 'Montant créé (XOF)', 'Payées', 'Encaissé (XOF)', 'Taux (%)']);
  salesReps.forEach((rep) => {
    reps.addRow([
      rep.name,
      rep.totalInvoices,
      money(rep.totalAmount),
      rep.paidInvoices,
      money(rep.paidAmount),
      Number(rep.conversionRate.toFixed(1)),
    ]);
  });

  return wb;
};

export const exportCommercialReportExcel = async (payload) => {
  const wb = buildCommercialWorkbook(payload);
  const fileName = `Rapport_${periodFileSlug(payload.periodLabel)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return fileName;
};
