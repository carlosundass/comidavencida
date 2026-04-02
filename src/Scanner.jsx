import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 20,
      qrbox: { width: 280, height: 180 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      videoConstraints: {
        facingMode: { exact: "environment" } // FORZAR CÁMARA TRASERA
      }
    });

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => { /* Ignorar errores de lectura */ }
    );

    return () => {
      scanner.clear().catch(err => console.error("Error al cerrar", err));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-6 flex justify-between items-center text-white absolute top-0 z-10">
        <h2 className="text-xl font-black italic tracking-tighter">comidavencida</h2>
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-xl rounded-full">
          <X size={24} />
        </button>
      </div>
      
      <div id="reader" className="w-full max-w-md overflow-hidden rounded-3xl"></div>
      
      <div className="mt-12 text-center px-10">
        <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest mb-4 animate-pulse">Escaneando...</div>
        <p className="text-white text-lg font-bold">Apunta al código de barras</p>
        <p className="text-white/40 text-sm mt-1">Usa la cámara trasera para mayor nitidez</p>
      </div>
    </div>
  );
};

export default Scanner;