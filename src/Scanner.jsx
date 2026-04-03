import React, { useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Zap } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-video");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { 
        facingMode: "environment",
        // Intentamos forzar a la cámara a usar el autoenfoque continuo
        advanced: [{ focusMode: "continuous" }] 
      },
      {
        fps: 15,
        // EL SECRETO DE LA RAPIDEZ: Solo buscamos códigos de barras de comida, no QRs
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128
        ]
      },
      (decodedText) => {
        onScan(decodedText);
        html5QrCode.stop().catch(console.error);
      },
      (errorMessage) => { /* Silencio */ }
    ).catch((err) => {
      console.error("Error al iniciar cámara:", err);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans overflow-hidden">
      <style>{`
        #reader-video { position: absolute; top: 0; left: 0; width: 100vw !important; height: 100vh !important; overflow: hidden; }
        #reader-video video { position: absolute !important; top: 50% !important; left: 50% !important; min-width: 100% !important; min-height: 100% !important; width: auto !important; height: auto !important; transform: translate(-50%, -50%) !important; object-fit: cover !important; }
        #reader-video canvas { display: none !important; }
      `}</style>

      <div className="flex justify-between items-center p-6 text-white absolute top-0 w-full z-20 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-black tracking-widest text-sm uppercase shadow-black drop-shadow-md">Escaneando</span>
        </div>
        <button onClick={onClose} className="bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          <X size={20} />
        </button>
      </div>

      <div id="reader-video"></div>
      <div className="absolute inset-0 pointer-events-none border-[60px] border-black/60 z-10"></div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[280px] h-[140px] border-2 border-white/40 rounded-xl pointer-events-none flex items-center justify-center">
        <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
        <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
        <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
        <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
        <div className="w-full h-[2px] bg-red-500 shadow-[0_0_15px_red] animate-pulse"></div>
      </div>

      <div className="absolute bottom-0 w-full p-8 text-center bg-gradient-to-t from-black via-black/80 to-transparent z-20 pb-12">
        <p className="text-white text-xl font-black tracking-tight drop-shadow-lg">Apunta al código de barras</p>
        <p className="text-gray-300 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold drop-shadow-md">No necesitas acercarte demasiado</p>
      </div>
    </div>
  );
};

export default Scanner;