import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (invoiceData, templateNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('Starting PDF generation...');
      
      // Use a robust selector for the rendered invoice element (mobile-safe)
      const existingInvoice = document.getElementById('invoice-root');
      
      console.log('Invoice element found:', !!existingInvoice);
      
      if (!existingInvoice) {
        console.error('Invoice element not found in DOM');
        throw new Error('Élément de facture introuvable. Veuillez réessayer.');
      }

      // Short delay to ensure DOM is fully rendered (optimize for speed)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Capturing invoice with html2canvas...');
      
      // Detect mobile device
      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      
      // For mobile, temporarily adjust the invoice container to fit better
      const originalWidth = existingInvoice.style.width;
      const originalHeight = existingInvoice.style.height;
      
      if (isMobile) {
        existingInvoice.style.width = '100vw';
        existingInvoice.style.height = 'auto';
        existingInvoice.style.maxWidth = '100vw';
      }
      
      // Wait for layout to settle
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(existingInvoice, {
        scale: isMobile ? 2 : Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: isMobile ? window.innerWidth : existingInvoice.scrollWidth,
        windowHeight: existingInvoice.scrollHeight
      });
      
      // Restore original styles
      if (isMobile) {
        existingInvoice.style.width = originalWidth;
        existingInvoice.style.height = originalHeight;
        existingInvoice.style.maxWidth = '';
      }
      
      console.log('Canvas created, generating PDF...');
      
      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions to fit the captured content
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = isMobile ? 210 : 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth; // Maintain aspect ratio
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const { number, date } = invoiceData.invoice;
      const { firstName, lastName } = invoiceData.clientInfo;
      const timestamp = new Date().getTime();

      let fileName;
      switch (templateNumber) {
        case 1:
          fileName = `Facture_KPB_${number}.pdf`;
          break;
        case 2:
          fileName = `KPB_${firstName}_${lastName}_${number}.pdf`;
          break;
        case 3:
          fileName = `Facture_${number}_${date}.pdf`;
          break;
        default:
          fileName = `facture_kpb_${timestamp}.pdf`;
      }

      console.log('Downloading PDF:', fileName);
      
      // Robust mobile download handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      try {
        const arrayBuffer = pdf.output('arraybuffer');
        const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // Prefer native share sheet on mobile when available (best iOS experience)
        const file = new File([blob], fileName, { type: 'application/pdf' });
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: fileName, text: 'Facture PDF' });
          // Sharing opened; return after user completes action
          return;
        }

        if (isIOS) {
          // iOS: open in the same tab to avoid popup blocking; user can Save to Files
          window.location.href = blobUrl;
        } else {
          // Other browsers: force download via anchor element
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.target = '_self';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (e) {
        console.warn('Primary download method failed, falling back to pdf.save', e);
        pdf.save(fileName);
      }
      
      console.log('PDF generation completed successfully');
      resolve();
      
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
};
