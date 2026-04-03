import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Zap } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-video");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" },
      {
        fps: 15,
        qrbox: { width: 250, height: 150 }
        // ELIMINAMOS aspectRatio para que se adapte naturalmente a la pantalla vertical
      },
      (decodedText) => {
        onScan(decodedText);
        html5QrCode.stop().catch(console.error);
      },
      (errorMessage) => {
        // Ignoramos errores continuos de búsqueda
      }
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
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 text-white absolute top-0 w-full z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-black tracking-widest text-sm uppercase">Escáner Activo</span>
        </div>
        <button onClick={onClose} className="bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          <X size={20} />
        </button>
      </div>

      {/* CONTENEDOR DEL VIDEO */}
      <div className="flex-1 relative flex items-center justify-center w-full h-full overflow-hidden bg-black">
        
        {/* LA MAGIA: Forzamos al video interno a cubrir el 100% de la pantalla ignorando los estilos de la librería */}
        <div 
          id="reader-video" 
          className="absolute inset-0 w-full h-full [&_video]:!w-full [&_video]:!h-full [&_video]:!object-cover"
        ></div>

        {/* MÁSCARA OSCURA */}
        <div className="absolute inset-0 pointer-events-none border-[50px] border-black/60 z-10"></div>
        
        {/* MARCO LÁSER */}
        <div className="relative z-10 w-[250px] h-[150px] border-2 border-white/50 rounded-xl pointer-events-none flex items-center justify-center">
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          
          {/* Láser rojo */}
          <div className="w-full h-[2px] bg-red-500 shadow-[0_0_12px_red] animate-pulse"></div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="absolute bottom-0 w-full p-8 text-center bg-gradient-to-t from-black via-black/90 to-transparent z-20 pb-12">
        <p className="text-white text-xl font-black tracking-tight">Enfoca el código</p>
        <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">El registro será automático</p>
      </div>
    </div>
  );
};

export default Scanner;