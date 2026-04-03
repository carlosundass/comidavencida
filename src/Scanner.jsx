import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Zap } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    // Usamos el "Core" de la librería para evitar que inyecte botones y menús feos
    const html5QrCode = new Html5Qrcode("reader-video");
    scannerRef.current = html5QrCode;

    html5QrCode.start(
      { facingMode: "environment" }, // Forzar siempre la cámara trasera
      {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0
      },
      (decodedText) => {
        // Cuando lee un código exitosamente
        onScan(decodedText);
        html5QrCode.stop().catch(console.error);
      },
      (errorMessage) => {
        // La librería tira errores constantes mientras busca el código, los ignoramos
      }
    ).catch((err) => {
      console.error("Error al iniciar la cámara:", err);
      alert("Por favor, permite el acceso a la cámara para escanear.");
    });

    // Limpieza: apagar la cámara si el usuario cierra el modal
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans">
      
      {/* HEADER DEL ESCÁNER */}
      <div className="flex justify-between items-center p-6 text-white absolute top-0 w-full z-20 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center gap-2">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-black tracking-widest text-sm uppercase">Escáner Activo</span>
        </div>
        <button onClick={onClose} className="bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          <X size={20} />
        </button>
      </div>

      {/* CONTENEDOR DEL VIDEO LIMPIO */}
      <div className="flex-1 relative flex items-center justify-center w-full h-full overflow-hidden bg-black">
        {/* Aquí la librería inyectará SOLO la etiqueta <video> */}
        <div id="reader-video" className="absolute inset-0 w-full h-full flex items-center justify-center [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>

        {/* MÁSCARA OSCURA ALREDEDOR DEL MARCO */}
        <div className="absolute inset-0 pointer-events-none border-[60px] border-black/60 z-10"></div>
        
        {/* MARCO DE ESCANEO ESTILO LÁSER */}
        <div className="relative z-10 w-[280px] h-[180px] border-2 border-white/50 rounded-xl pointer-events-none flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] sm:shadow-none">
          {/* Esquinas destacadas */}
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
          
          {/* Línea láser animada */}
          <div className="w-full h-[2px] bg-red-500 shadow-[0_0_12px_red] animate-pulse"></div>
        </div>
      </div>

      {/* FOOTER DEL ESCÁNER */}
      <div className="absolute bottom-0 w-full p-8 text-center bg-gradient-to-t from-black via-black/90 to-transparent z-20 pb-12">
        <p className="text-white text-xl font-black tracking-tight">Enfoca el código</p>
        <p className="text-gray-400 text-xs mt-2 uppercase tracking-widest font-bold">El registro será automático</p>
      </div>
    </div>
  );
};

export default Scanner;