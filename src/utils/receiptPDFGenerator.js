import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Utility to detect mobile devices
const isMobileDevice = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// Utility to detect iOS devices
const isIOSDevice = () => 
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const generateReceiptPDF = async (receiptElement, theme = 'Receipt1', receiptData = {}) => {
  try {
    if (!receiptElement) {
      throw new Error('Élément de reçu introuvable');
    }

    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 800));

    const isMobile = isMobileDevice();
    
    // Store original styles
    const originalStyles = {
      width: receiptElement.style.width,
      height: receiptElement.style.height,
      maxWidth: receiptElement.style.maxWidth,
      transform: receiptElement.style.transform
    };

    // Optimize for mobile capture
    if (isMobile) {
      receiptElement.style.width = '80mm';
      receiptElement.style.height = 'auto';
      receiptElement.style.maxWidth = '80mm';
      receiptElement.style.transform = 'scale(1)';
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Capture receipt with high quality
    const canvas = await html2canvas(receiptElement, {
      scale: 3,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: '#ffffff',
      scrollY: -window.scrollY,
      scrollX: -window.scrollX
    });

    // Restore original styles
    Object.keys(originalStyles).forEach(key => {
      receiptElement.style[key] = originalStyles[key];
    });

    // Generate PDF with receipt dimensions
    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdfWidth = canvas.width * 0.264583; // Convert px to mm
    const pdfHeight = canvas.height * 0.264583;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    // Generate filename
    const timestamp = new Date().getTime();
    const invoiceNumber = receiptData?.invoice?.number || timestamp;
    const fileName = `Receipt_${invoiceNumber}.pdf`;

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
            title: 'Reçu',
            text: 'Votre reçu est prêt'
          });
          return;
        }
      }

      // Fallback to blob URL download
      const blobUrl = URL.createObjectURL(blob);
      
      if (isIOSDevice()) {
        const newWindow = window.open(blobUrl, '_blank');
        if (!newWindow) {
          window.location.href = blobUrl;
        }
      } else {
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
        }, 100);
      }
    } catch (shareError) {
      pdf.save(fileName);
    }

  } catch (error) {
    throw new Error(error.message || 'Échec de génération du reçu PDF');
  }
};
