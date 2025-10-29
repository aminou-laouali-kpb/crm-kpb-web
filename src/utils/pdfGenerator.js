import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (invoiceData, templateNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Use a robust selector for the rendered invoice element (mobile-safe)
      const existingInvoice = document.getElementById('invoice-root');
      
      if (!existingInvoice) {
        throw new Error('Invoice element not found');
      }

      // Short delay to ensure DOM is fully rendered (optimize for speed)
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(existingInvoice, {
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: existingInvoice.scrollWidth,
        windowHeight: existingInvoice.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
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

      // iOS/Safari-friendly download handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

      if (isIOS) {
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        pdf.save(fileName);
      }
      
    } catch (error) {
      reject(error);
    }
  });
};
