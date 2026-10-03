import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const isIOSDevice = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const waitForImages = async (root) => {
  const images = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
          // Safety timeout so a broken image never blocks download forever
          setTimeout(done, 4000);
        })
    )
  );
};

const buildFileName = (invoiceData, templateNumber) => {
  const { number = '', date = '' } = invoiceData.invoice || {};
  const { firstName = '', lastName = '' } = invoiceData.clientInfo || {};
  const timestamp = Date.now();
  const safe = (value) => String(value || '').replace(/[^\w.-]+/g, '_');

  switch (templateNumber) {
    case 1:
      return `Facture_KPB_${safe(number) || timestamp}.pdf`;
    case 2:
      return `KPB_${safe(firstName)}_${safe(lastName)}_${safe(number) || timestamp}.pdf`;
    case 3:
      return `Facture_${safe(number) || timestamp}_${safe(date)}.pdf`;
    default:
      return `facture_kpb_${timestamp}.pdf`;
  }
};

const triggerBlobDownload = async (blob, fileName) => {
  // 1) Prefer classic download — most reliable for commercials on desktop/Android
  const blobUrl = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    // Keep blob alive briefly for slow browsers / iOS
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
  }

  // 2) On iOS Safari, <a download> is unreliable — also open the PDF
  if (isIOSDevice()) {
    const openUrl = URL.createObjectURL(blob);
    const opened = window.open(openUrl, '_blank', 'noopener,noreferrer');
    if (!opened) {
      // Popup blocked: offer share sheet if available
      if (navigator.share && navigator.canShare) {
        try {
          const file = new File([blob], fileName, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Facture KPB',
              text: 'Votre facture est prête',
            });
          }
        } catch (err) {
          // User cancelled share — not a hard failure
          if (err?.name !== 'AbortError') {
            throw err;
          }
        }
      }
    }
    setTimeout(() => URL.revokeObjectURL(openUrl), 60_000);
  }
};

/**
 * Capture the on-screen invoice (#invoice-root) into a downloadable PDF.
 * Uses an off-DOM clone so AppLayout overflow / mobile scaling cannot break capture.
 */
export const generatePDF = async (invoiceData, templateNumber) => {
  const existingInvoice = document.getElementById('invoice-root');
  if (!existingInvoice) {
    throw new Error('Élément de facture introuvable. Rouvrez la facture puis réessayez.');
  }

  const isMobile = isMobileDevice();
  await waitForImages(existingInvoice);
  // Let fonts/layout settle
  await new Promise((r) => setTimeout(r, isMobile ? 400 : 150));

  // Off-screen clone at fixed A4 width — avoids clipping from sidebar/layout
  const cloneHost = document.createElement('div');
  cloneHost.setAttribute('aria-hidden', 'true');
  cloneHost.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:794px',
    'background:#ffffff',
    'z-index:-1',
    'pointer-events:none',
  ].join(';');

  const clone = existingInvoice.cloneNode(true);
  clone.id = 'invoice-root-pdf-clone';
  clone.style.cssText = [
    'width:794px',
    'max-width:794px',
    'height:auto',
    'transform:none',
    'display:block',
    'visibility:visible',
    'background:#ffffff',
  ].join(';');
  cloneHost.appendChild(clone);
  document.body.appendChild(cloneHost);

  try {
    await waitForImages(clone);
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const canvas = await html2canvas(clone, {
      scale: isMobile ? 1.75 : 2,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      width: 794,
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('invoice-root-pdf-clone');
        if (el) {
          el.style.display = 'block';
          el.style.visibility = 'visible';
          el.style.width = '794px';
          el.style.maxWidth = '794px';
          el.style.transform = 'none';
        }
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error('Capture PDF vide. Rechargez la page et réessayez.');
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdfWidth = 210; // A4 mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(pdfHeight, 1)]);
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

    const fileName = buildFileName(invoiceData, templateNumber);
    const blob = pdf.output('blob');

    try {
      await triggerBlobDownload(blob, fileName);
    } catch {
      // Last resort — jsPDF native save
      pdf.save(fileName);
    }
  } catch (error) {
    const msg = error?.message || '';
    if (/tainted|SecurityError|toDataURL/i.test(msg)) {
      throw new Error(
        'Impossible de générer le PDF (image bloquée). Rechargez la page et réessayez.'
      );
    }
    throw new Error(msg || 'Échec de génération du PDF. Veuillez réessayer.');
  } finally {
    cloneHost.remove();
  }
};
