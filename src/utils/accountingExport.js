import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Format currency helper
const formatCurrency = (amount, currency = 'XOF') => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// Export to Excel with multiple sheets
export const exportAccountingToExcel = async (data, period) => {
  const { invoices, expenses, plannedIncome, stats } = data;
  
  const wb = new ExcelJS.Workbook();
  
  // Sheet 1: Summary
  const wsSummary = wb.addWorksheet('Résumé');
  wsSummary.columns = [{ width: 30 }, { width: 20 }];
  wsSummary.addRow(['Rapport Comptable - ' + period]);
  wsSummary.addRow([]);
  wsSummary.addRow(['Métrique', 'Montant (XOF)']);
  wsSummary.addRow(['Revenus totaux (ventes payées)', stats.totalRevenue]);
  wsSummary.addRow(['Dépenses totales', stats.totalExpenses]);
  wsSummary.addRow(['Solde net', stats.netBalance]);
  wsSummary.addRow(['Revenus en attente', stats.pendingIncome]);
  wsSummary.addRow(['Nombre de ventes', stats.salesCount]);
  wsSummary.addRow(['Nombre de dépenses', stats.expensesCount]);
  
  // Sheet 2: Expenses
  const wsExpenses = wb.addWorksheet('Dépenses');
  wsExpenses.columns = [{ width: 12 }, { width: 30 }, { width: 20 }, { width: 15 }, { width: 18 }, { width: 12 }];
  wsExpenses.addRow(['Date', 'Description', 'Catégorie', 'Montant (XOF)', 'Méthode de paiement', 'Statut']);
  expenses.forEach(exp => {
    wsExpenses.addRow([
      format(new Date(exp.expense_date), 'dd/MM/yyyy', { locale: fr }),
      exp.description,
      exp.expense_categories?.name || 'Non catégorisé',
      exp.amount,
      exp.payment_method || '-',
      exp.status === 'paid' ? 'Payé' : exp.status === 'pending' ? 'En attente' : exp.status
    ]);
  });
  
  // Sheet 3: Sales
  const wsSales = wb.addWorksheet('Ventes');
  wsSales.columns = [{ width: 12 }, { width: 15 }, { width: 25 }, { width: 25 }, { width: 15 }, { width: 15 }];
  wsSales.addRow(['Date', 'N° Facture', 'Client', 'Email', 'Montant (XOF)', 'Commercial']);
  invoices.forEach(inv => {
    wsSales.addRow([
      format(new Date(inv.invoice_date), 'dd/MM/yyyy', { locale: fr }),
      inv.invoice_number,
      `${inv.client_first_name} ${inv.client_last_name}`,
      inv.client_email,
      inv.amount,
      inv.sales_representative
    ]);
  });
  
  // Sheet 4: Planned Income
  const wsIncome = wb.addWorksheet('Entrées planifiées');
  wsIncome.columns = [{ width: 15 }, { width: 30 }, { width: 20 }, { width: 15 }, { width: 12 }, { width: 10 }];
  wsIncome.addRow(['Date échéance', 'Description', 'Source', 'Montant (XOF)', 'Statut', 'Récurrent']);
  plannedIncome.forEach(inc => {
    wsIncome.addRow([
      format(new Date(inc.due_date), 'dd/MM/yyyy', { locale: fr }),
      inc.description,
      inc.source || '-',
      inc.amount,
      inc.status === 'received' ? 'Reçu' : inc.status === 'pending' ? 'En attente' : inc.status,
      inc.is_recurring ? 'Oui' : 'Non'
    ]);
  });
  
  // Generate and download
  const fileName = `rapport_comptable_${period.replace(/\s/g, '_')}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

// Export to PDF
export const exportAccountingToPDF = (data, period) => {
  const { invoices, expenses, plannedIncome, stats, expensesByCategory } = data;
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 20;
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Comptable', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(period, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.setFontSize(10);
  doc.text(`Généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}`, pageWidth / 2, yPos, { align: 'center' });
  
  // Summary section
  yPos += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Résumé Financier', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryItems = [
    ['Revenus totaux (ventes payées)', formatCurrency(stats.totalRevenue)],
    ['Dépenses totales', formatCurrency(stats.totalExpenses)],
    ['Solde net', formatCurrency(stats.netBalance)],
    ['Revenus en attente', formatCurrency(stats.pendingIncome)],
  ];
  
  summaryItems.forEach(([label, value]) => {
    doc.text(label + ':', 14, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - 14, yPos, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    yPos += 7;
  });
  
  // Stats
  yPos += 5;
  doc.setFillColor(240, 240, 240);
  doc.rect(14, yPos - 5, pageWidth - 28, 15, 'F');
  doc.text(`Nombre de ventes: ${stats.salesCount}`, 20, yPos + 2);
  doc.text(`Nombre de dépenses: ${stats.expensesCount}`, pageWidth / 2, yPos + 2);
  
  // Expenses by category
  yPos += 20;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Dépenses par Catégorie', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (expensesByCategory && expensesByCategory.length > 0) {
    expensesByCategory.forEach((cat) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`• ${cat.name}`, 14, yPos);
      doc.text(formatCurrency(cat.amount), pageWidth - 14, yPos, { align: 'right' });
      yPos += 6;
    });
  } else {
    doc.text('Aucune dépense enregistrée', 14, yPos);
    yPos += 6;
  }
  
  // Recent expenses table
  yPos += 10;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Détail des Dépenses', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  // Table header
  doc.setFillColor(50, 50, 50);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, yPos - 4, pageWidth - 28, 7, 'F');
  doc.text('Date', 16, yPos);
  doc.text('Description', 40, yPos);
  doc.text('Catégorie', 110, yPos);
  doc.text('Montant', pageWidth - 16, yPos, { align: 'right' });
  
  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const displayExpenses = expenses.slice(0, 15);
  displayExpenses.forEach((exp, index) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, yPos - 4, pageWidth - 28, 6, 'F');
    }
    
    doc.text(format(new Date(exp.expense_date), 'dd/MM/yy'), 16, yPos);
    const desc = exp.description.length > 35 ? exp.description.substring(0, 32) + '...' : exp.description;
    doc.text(desc, 40, yPos);
    doc.text(exp.expense_categories?.name || '-', 110, yPos);
    doc.text(formatCurrency(exp.amount), pageWidth - 16, yPos, { align: 'right' });
    yPos += 6;
  });
  
  if (expenses.length > 15) {
    yPos += 3;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`... et ${expenses.length - 15} autres dépenses`, 14, yPos);
    doc.setTextColor(0, 0, 0);
  }
  
  // Sales section
  yPos += 15;
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ventes (Factures Payées)', 14, yPos);
  
  yPos += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  // Table header
  doc.setFillColor(50, 50, 50);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, yPos - 4, pageWidth - 28, 7, 'F');
  doc.text('Date', 16, yPos);
  doc.text('N° Facture', 40, yPos);
  doc.text('Client', 75, yPos);
  doc.text('Commercial', 130, yPos);
  doc.text('Montant', pageWidth - 16, yPos, { align: 'right' });
  
  yPos += 6;
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  
  const displayInvoices = invoices.slice(0, 15);
  displayInvoices.forEach((inv, index) => {
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    
    if (index % 2 === 0) {
      doc.setFillColor(248, 248, 248);
      doc.rect(14, yPos - 4, pageWidth - 28, 6, 'F');
    }
    
    doc.text(format(new Date(inv.invoice_date), 'dd/MM/yy'), 16, yPos);
    doc.text(inv.invoice_number, 40, yPos);
    const clientName = `${inv.client_first_name} ${inv.client_last_name}`;
    const shortClient = clientName.length > 25 ? clientName.substring(0, 22) + '...' : clientName;
    doc.text(shortClient, 75, yPos);
    doc.text(inv.sales_representative, 130, yPos);
    doc.text(formatCurrency(inv.amount), pageWidth - 16, yPos, { align: 'right' });
    yPos += 6;
  });
  
  if (invoices.length > 15) {
    yPos += 3;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`... et ${invoices.length - 15} autres ventes`, 14, yPos);
    doc.setTextColor(0, 0, 0);
  }
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, 290, { align: 'center' });
  }
  
  // Save
  const fileName = `rapport_comptable_${period.replace(/\s/g, '_')}.pdf`;
  doc.save(fileName);
};

/** Export accounting data as CSV for external accountants */
export const exportAccountingToCSV = (data, period) => {
  const { invoices, expenses, stats } = data;
  const rows = [
    ['Rapport Comptable KPB Education', period],
    [],
    ['Métrique', 'Montant (XOF)'],
    ['Revenus totaux', stats.totalRevenue],
    ['Dépenses totales', stats.totalExpenses],
    ['Solde net', stats.netBalance],
    [],
    ['Date paiement', 'N° Facture', 'Client', 'Commercial', 'Montant', 'Devise'],
    ...invoices.map((inv) => [
      inv.last_status_change ? new Date(inv.last_status_change).toLocaleDateString('fr-FR') : '',
      inv.invoice_number,
      `${inv.client_first_name} ${inv.client_last_name}`,
      inv.sales_representative,
      inv.amount,
      inv.currency || 'XOF',
    ]),
    [],
    ['Date', 'Description', 'Catégorie', 'Montant'],
    ...expenses.map((exp) => [
      exp.expense_date,
      exp.description,
      exp.expense_categories?.name || '',
      exp.amount,
    ]),
  ];

  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `comptabilite_kpb_${period.replace(/\s/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};
