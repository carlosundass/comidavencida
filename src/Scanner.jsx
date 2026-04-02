import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  useEffect(() => {
    // Configuración para forzar cámara trasera y mejorar interfaz
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 20,
      qrbox: { width: 280, height: 180 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      // Forzamos la cámara trasera mediante la configuración de video
      videoConstraints: {
        facingMode: { exact: "environment" } 
      }
    });

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => { /* Silencio en errores de escaneo */ }
    );

    return () => {
      scanner.clear().catch(err => console.error("Error al cerrar", err));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md p-6 flex justify-between items-center text-white absolute top-0 z-10">
        <h2 className="text-xl font-black tracking-tighter italic">comidavencida</h2>
        <button onClick={onClose} className="p-3 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
          <X size={24} />
        </button>
      </div>
      
      <div id="reader" className="w-full max-w-md overflow-hidden"></div>
      
      <div className="mt-12 text-center px-8 z-10">
        <div className="inline-block bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-4">Escaneando...</div>
        <p className="text-white text-lg font-bold">Apunta al código de barras</p>
        <p className="text-white/40 text-sm mt-1">Usa la cámara trasera para mayor nitidez</p>
      </div>
    </div>
  );
};

export default Scanner;