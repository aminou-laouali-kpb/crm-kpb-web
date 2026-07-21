import jsPDF from 'jspdf';

/**
 * Generate a simple text-based PDF of the signed contract + proof block.
 * Returns a Blob.
 */
export function generateContractPdfBlob({
  renderedBody,
  signerName,
  signerEmail,
  signedAt,
  contractHash,
  templateVersion,
  signerIp,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const addLine = (text, options = {}) => {
    const fontSize = options.fontSize || 9;
    doc.setFontSize(fontSize);
    if (options.bold) doc.setFont('helvetica', 'bold');
    else doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += fontSize + 3;
    }
  };

  addLine('KPB Education — Contrat de prestation signé', { bold: true, fontSize: 14 });
  y += 6;
  addLine(`Version : ${templateVersion}`);
  addLine(`Signataire : ${signerName} <${signerEmail}>`);
  addLine(`Signé le : ${signedAt ? new Date(signedAt).toLocaleString('fr-FR') : ''}`);
  if (signerIp) addLine(`IP : ${signerIp}`);
  addLine(`Hash SHA-256 : ${contractHash}`);
  y += 10;
  addLine('— Contenu du contrat —', { bold: true, fontSize: 11 });
  y += 4;

  // Strip markdown markers for PDF readability
  const plain = String(renderedBody || '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\|/g, ' ');

  for (const paragraph of plain.split('\n')) {
    if (paragraph.trim()) addLine(paragraph.trim());
    else y += 4;
  }

  y += 12;
  addLine('— Preuve de signature électronique —', { bold: true, fontSize: 11 });
  addLine('Le client a coché « Lu et approuvé » et signé électroniquement via la plateforme KPB Education.');

  return doc.output('blob');
}
