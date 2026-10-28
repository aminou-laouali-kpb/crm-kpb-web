import jsPDF from 'jspdf';
import kpbLogo from '../assets/kpb-logo.png';
import kpbStamp from '../assets/kpb-stamp.png';
import { formatCurrency } from './formatCurrency';

export const QUITTANCE_CONDITIONS = [
  "Ce reçu atteste de l'encaissement du montant indiqué par KPB Education au titre des prestations décrites ci-dessus, conformément au contrat d'accompagnement signé par le client.",
  "Désistement volontaire : en cas de désistement volontaire du client, aucun remboursement ne sera effectué. Le montant versé reste toutefois valable pour une autre demande ou prestation, dans la mesure du possible.",
  "Réclamation : en cas de problème, toute demande de remboursement ne pourra être acceptée que si elle est formulée dans les 72 heures (3 jours) suivant le paiement. Passé ce délai, aucune demande ne sera recevable.",
  "Tout remboursement accepté est effectué par le même moyen de paiement, déduction faite des frais de transaction éventuels.",
];

const loadImage = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve({ data: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

export const quittanceNumber = (invoiceNumber) =>
  `REC-${String(invoiceNumber || '').replace(/^KPB-/, '') || Date.now()}`;

// jsPDF's default font lacks the narrow no-break space used by fr-FR formatting
const money = (v, cur) => formatCurrency(v, cur).replace(/[\u202F\u00A0]/g, ' ');

/** Génère la quittance PDF d'une facture payée et renvoie un Blob. */
export async function generateQuittanceBlob(inv) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const m = 40;
  let y = m;
  const cur = inv.currency || 'XOF';

  const logo = await loadImage(kpbLogo);
  if (logo) doc.addImage(logo.data, 'PNG', m, y, 70 * (logo.w / logo.h), 70);
  doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(30, 58, 138);
  doc.text('QUITTANCE DE PAIEMENT', W - m, y + 25, { align: 'right' });
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(80);
  doc.text(`N° ${quittanceNumber(inv.invoice_number)}`, W - m, y + 42, { align: 'right' });
  doc.text('KPB Education - SIRET 851 365 908 00025', W - m, y + 55, { align: 'right' });
  doc.text('8 Rue André Vasseur, 31200 Toulouse, France', W - m, y + 67, { align: 'right' });
  y += 90;
  doc.setDrawColor(30, 58, 138).setLineWidth(1.5).line(m, y, W - m, y);
  y += 22;

  const paidAt = inv.last_status_change ? new Date(inv.last_status_change) : new Date();
  const rows = [
    ['Client', `${inv.client_first_name || ''} ${inv.client_last_name || ''}`.trim()],
    ['WhatsApp', inv.client_whatsapp || '-'],
    ['Email', inv.client_email || '-'],
    ['Facture de référence', inv.invoice_number || '-'],
    ['Date du paiement', paidAt.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })],
    ['Mode de paiement', inv.payment_type || '-'],
    ['Commercial', inv.sales_representative || '-'],
    ['Service', inv.service_description || '-'],
  ];
  doc.setTextColor(20).setFontSize(10);
  for (const [k, v] of rows) {
    doc.setFont('helvetica', 'bold').text(`${k} :`, m, y);
    const lines = doc.setFont('helvetica', 'normal').splitTextToSize(String(v), W - m * 2 - 140);
    doc.text(lines, m + 140, y);
    y += 16 * lines.length;
  }

  y += 10;
  const offer = Number(inv.total_offer_amount) || 0;
  const boxH = offer > 0 ? 80 : 40;
  doc.setFillColor(239, 246, 255).setDrawColor(30, 58, 138).rect(m, y, W - m * 2, boxH, 'FD');
  doc.setFont('helvetica', 'bold').setFontSize(13).setTextColor(30, 58, 138);
  doc.text('Montant reçu', m + 12, y + 25);
  doc.text(money(inv.amount, cur), W - m - 12, y + 25, { align: 'right' });
  if (offer > 0) {
    const rest = inv.remaining_amount != null ? Number(inv.remaining_amount) : Math.max(offer - Number(inv.amount || 0), 0);
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(40);
    doc.text("Montant total de l'offre", m + 12, y + 47);
    doc.text(money(offer, cur), W - m - 12, y + 47, { align: 'right' });
    doc.text('Montant restant à payer', m + 12, y + 65);
    doc.text(money(rest, cur), W - m - 12, y + 65, { align: 'right' });
  }
  y += boxH + 28;

  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(30, 58, 138);
  doc.text('Conditions générales et modalités de remboursement', m, y);
  y += 16;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(40);
  QUITTANCE_CONDITIONS.forEach((c, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${c}`, W - m * 2);
    doc.text(lines, m, y);
    y += lines.length * 12 + 6;
  });

  y += 10;
  const stamp = await loadImage(kpbStamp);
  doc.setFontSize(9).text(`Fait le ${new Date().toLocaleDateString('fr-FR')} - Pour KPB Education`, W - m, y, { align: 'right' });
  if (stamp) doc.addImage(stamp.data, 'PNG', W - m - 110, y + 8, 110, 110 * (stamp.h / stamp.w));

  doc.setFontSize(8).setTextColor(120);
  doc.text('Ce document est un reçu de paiement et ne remplace pas la facture.', W / 2, doc.internal.pageSize.getHeight() - 25, { align: 'center' });
  return doc.output('blob');
}

export async function downloadQuittance(inv) {
  const blob = await generateQuittanceBlob(inv);
  const name = `${quittanceNumber(inv.invoice_number)}.pdf`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
