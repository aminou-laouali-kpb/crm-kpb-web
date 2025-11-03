import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Utility to detect mobile devices
const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Utility to detect iOS devices
const isIOSDevice = () => 
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const generatePDF = async (invoiceData, templateNumber) => {
  return new Promise(async (resolve, reject) => {
    try {
      const existingInvoice = document.getElementById('invoice-root');
      
      if (!existingInvoice) {
        throw new Error('Élément de facture introuvable. Veuillez réessayer.');
      }

      // Longer delay to ensure DOM is fully rendered on all devices
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isMobile = isMobileDevice();
      
      // Store original styles for restoration
      const originalStyles = {
        width: existingInvoice.style.width,
        height: existingInvoice.style.height,
        maxWidth: existingInvoice.style.maxWidth,
        transform: existingInvoice.style.transform
      };
      
      // Optimize layout for mobile capture
      if (isMobile) {
        existingInvoice.style.width = '794px';
        existingInvoice.style.height = 'auto';
        existingInvoice.style.maxWidth = '794px';
        existingInvoice.style.transform = 'scale(1)';
        
        // Wait for layout changes to apply
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Capture with optimized settings for mobile
      const canvas = await html2canvas(existingInvoice, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        scrollX: -window.scrollX,
        windowWidth: existingInvoice.scrollWidth,
        windowHeight: existingInvoice.scrollHeight,
        removeContainer: false
      });
      
      // Restore original styles immediately
      Object.keys(originalStyles).forEach(key => {
        existingInvoice.style[key] = originalStyles[key];
      });
      
      // Generate PDF with proper dimensions
      const imgData = canvas.toDataURL('image/png', 1.0);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;
      
      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      
      // Generate filename
      const { number = '', date = '' } = invoiceData.invoice || {};
      const { firstName = '', lastName = '' } = invoiceData.clientInfo || {};
      const timestamp = new Date().getTime();

      let fileName;
      switch (templateNumber) {
        case 1:
          fileName = `Facture_KPB_${number || timestamp}.pdf`;
          break;
        case 2:
          fileName = `KPB_${firstName}_${lastName}_${number || timestamp}.pdf`;
          break;
        case 3:
          fileName = `Facture_${number || timestamp}_${date}.pdf`;
          break;
        default:
          fileName = `facture_kpb_${timestamp}.pdf`;
      }

      // Download with mobile-optimized method
      const arrayBuffer = pdf.output('arraybuffer');
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      
      try {
        // Try Web Share API first (best for mobile)
        if (isMobile && navigator.share && navigator.canShare) {
          const file = new File([blob], fileName, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ 
              files: [file], 
              title: 'Facture KPB',
              text: 'Votre facture est prête'
            });
            resolve();
            return;
          }
        }

        // Fallback to blob URL download
        const blobUrl = URL.createObjectURL(blob);
        
        if (isIOSDevice()) {
          // iOS: open in new tab to allow "Save to Files"
          const newWindow = window.open(blobUrl, '_blank');
          if (!newWindow) {
            // If popup blocked, try direct navigation
            window.location.href = blobUrl;
          }
        } else {
          // Android and Desktop: force download
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
          }, 100);
        }
        
        resolve();
      } catch (shareError) {
        // Final fallback: jsPDF's built-in save
        pdf.save(fileName);
        resolve();
      }
      
    } catch (error) {
      reject(new Error(error.message || 'Échec de génération du PDF. Veuillez réessayer.'));
    }
  });
};
