import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { X, Zap } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 30,
      qrbox: { width: 250, height: 150 },
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      videoConstraints: {
        facingMode: { exact: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    });

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear();
      },
      (error) => { /* Ignorar consola para no saturar */ }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [onScan]);

  return (
    <div className="absolute inset-0 bg-black z-[100] flex flex-col font-sans">
      {/* Header Escáner */}
      <div className="p-6 flex justify-between items-center text-white relative z-10 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-yellow-400" />
          <h2 className="text-sm font-black uppercase tracking-widest">Escáner Activo</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-white/20 rounded-full backdrop-blur-md">
          <X size={20} />
        </button>
      </div>
      
      {/* Contenedor del video con marco visual */}
      <div className="flex-1 relative flex items-center justify-center">
        <div id="reader" className="absolute inset-0 object-cover [&>video]:object-cover w-full h-full"></div>
        
        {/* Overlay Visual (Marco) */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40"></div>
        <div className="relative z-10 w-[250px] h-[150px] border-2 border-white/50 rounded-xl pointer-events-none">
          {/* Esquinas destacadas */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          
          {/* Línea láser animada */}
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/80 shadow-[0_0_8px_red] rounded-full animate-pulse"></div>
        </div>
      </div>
      
      {/* Footer Escáner */}
      <div className="p-8 text-center relative z-10 bg-gradient-to-t from-black/90 to-transparent pb-12">
        <p className="text-white text-lg font-bold">Enfoca el código de barras</p>
        <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">La app detectará el nombre</p>
      </div>
    </div>
  );
};

export default Scanner;