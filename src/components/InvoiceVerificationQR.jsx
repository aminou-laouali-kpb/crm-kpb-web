import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildVerificationUrl } from '../utils/invoiceVerification';

/**
 * QR code permettant au client de vérifier l'authenticité de la facture.
 */
const InvoiceVerificationQR = ({ invoiceNumber, size = 96 }) => {
  const [dataUrl, setDataUrl] = useState('');
  const url = buildVerificationUrl(invoiceNumber);

  useEffect(() => {
    let cancelled = false;
    if (!invoiceNumber) {
      setDataUrl('');
      return undefined;
    }
    QRCode.toDataURL(url, {
      width: size * 3,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1e3a8a', light: '#ffffff' },
    })
      .then((d) => {
        if (!cancelled) setDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [url, invoiceNumber, size]);

  if (!invoiceNumber) return null;

  return (
    <div className="flex items-center gap-3">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt={`QR de vérification de la facture ${invoiceNumber}`}
          style={{ width: size, height: size }}
          className="border border-gray-300 rounded bg-white p-1"
        />
      ) : (
        <div
          style={{ width: size, height: size }}
          className="border border-dashed border-gray-300 rounded"
        />
      )}
      <div className="text-left">
        <p className="text-[11px] font-bold text-blue-700 uppercase">Facture vérifiable</p>
        <p className="text-[10px] text-gray-600 leading-snug max-w-[220px]">
          Scannez ce QR code pour confirmer que cette facture a bien été émise par KPB Education.
        </p>
        <p className="text-[9px] text-gray-400 break-all mt-0.5">{url}</p>
      </div>
    </div>
  );
};

export default InvoiceVerificationQR;
