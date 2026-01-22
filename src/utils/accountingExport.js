import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
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
export const exportAccountingToExcel = (data, period) => {
  const { invoices, expenses, plannedIncome, stats } = data;
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Summary
  const summaryData = [
    ['Rapport Comptable - ' + period],
    [''],
    ['Métrique', 'Montant (XOF)'],
    ['Revenus totaux (ventes payées)', stats.totalRevenue],
    ['Dépenses totales', stats.totalExpenses],
    ['Solde net', stats.netBalance],
    ['Revenus en attente', stats.pendingIncome],
    ['Nombre de ventes', stats.salesCount],
    ['Nombre de dépenses', stats.expensesCount],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');
  
  // Sheet 2: Expenses
  const expensesHeader = ['Date', 'Description', 'Catégorie', 'Montant (XOF)', 'Méthode de paiement', 'Statut'];
  const expensesRows = expenses.map(exp => [
    format(new Date(exp.expense_date), 'dd/MM/yyyy', { locale: fr }),
    exp.description,
    exp.expense_categories?.name || 'Non catégorisé',
    exp.amount,
    exp.payment_method || '-',
    exp.status === 'paid' ? 'Payé' : exp.status === 'pending' ? 'En attente' : exp.status
  ]);
  const wsExpenses = XLSX.utils.aoa_to_sheet([expensesHeader, ...expensesRows]);
  wsExpenses['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 18 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Dépenses');
  
  // Sheet 3: Sales (Paid Invoices)
  const salesHeader = ['Date', 'N° Facture', 'Client', 'Email', 'Montant (XOF)', 'Commercial'];
  const salesRows = invoices.map(inv => [
    format(new Date(inv.invoice_date), 'dd/MM/yyyy', { locale: fr }),
    inv.invoice_number,
    `${inv.client_first_name} ${inv.client_last_name}`,
    inv.client_email,
    inv.amount,
    inv.sales_representative
  ]);
  const wsSales = XLSX.utils.aoa_to_sheet([salesHeader, ...salesRows]);
  wsSales['!cols'] = [{ wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSales, 'Ventes');
  
  // Sheet 4: Planned Income
  const incomeHeader = ['Date échéance', 'Description', 'Source', 'Montant (XOF)', 'Statut', 'Récurrent'];
  const incomeRows = plannedIncome.map(inc => [
    format(new Date(inc.due_date), 'dd/MM/yyyy', { locale: fr }),
    inc.description,
    inc.source || '-',
    inc.amount,
    inc.status === 'received' ? 'Reçu' : inc.status === 'pending' ? 'En attente' : inc.status,
    inc.is_recurring ? 'Oui' : 'Non'
  ]);
  const wsIncome = XLSX.utils.aoa_to_sheet([incomeHeader, ...incomeRows]);
  wsIncome['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 12 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsIncome, 'Entrées planifiées');
  
  // Generate and download
  const fileName = `rapport_comptable_${period.replace(/\s/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
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
