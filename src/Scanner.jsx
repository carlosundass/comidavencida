import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 15,
      qrbox: { width: 300, height: 160 }, 
      rememberLastUsedCamera: true,
    });

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => { /* Silencio en errores de lectura */ }
    );

    return () => {
      scanner.clear().catch(err => console.error("Error al limpiar", err));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center">
      <div className="w-full max-w-md p-6 flex justify-between items-center text-white absolute top-0">
        <h2 className="text-xl font-black italic">comidavencida</h2>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full">
          <X size={24} />
        </button>
      </div>
      <div id="reader" className="w-full max-w-md"></div>
      <div className="mt-10 text-center px-10">
        <p className="text-white text-lg font-bold">Escaneando producto...</p>
        <p className="text-white/40 text-sm mt-1">Busca el código de barras en el envase</p>
      </div>
    </div>
  );
};

export default Scanner;