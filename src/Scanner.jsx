import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Zap, AlertCircle, ZoomIn } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const trackRef = useRef(null); // Referencia al lente físico de la cámara
  const [errorCamara, setErrorCamara] = useState('');
  
  // Estados para el Zoom
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomParams, setZoomParams] = useState({ min: 1, max: 2, step: 0.1 });

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-container");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 100 }, 
      aspectRatio: 1.0, 
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128
      ]
    };

    html5QrCode.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.stop().then(() => {
            onScan(decodedText);
          }).catch(console.error);
        }
      },
      (errorMessage) => { /* Silencio */ }
    ).then(() => {
      // UNA VEZ QUE LA CÁMARA ENCIENDE, BUSCAMOS EL CONTROL DE ZOOM
      const videoElement = document.querySelector('#reader-container video');
      if (videoElement && videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        trackRef.current = track;
        
        // Verificamos si el navegador permite hacer zoom
        if (track.getCapabilities) {
          const capabilities = track.getCapabilities();
          if (capabilities.zoom) {
            setZoomSupported(true);
            setZoomParams({
              min: capabilities.zoom.min || 1,
              max: capabilities.zoom.max || 3, // Limitamos a 3x para que no se pixele demasiado
              step: capabilities.zoom.step || 0.1
            });
            // Establecer el zoom actual
            const settings = track.getSettings();
            setZoomLevel(settings.zoom || capabilities.zoom.min || 1);
          }
        }
      }
    }).catch((err) => {
      console.error("Error al iniciar cámara:", err);
      setErrorCamara("Para usar la cámara, debes darle permisos o estar en una conexión segura (HTTPS).");
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [onScan]);

  // Función para cambiar el zoom en vivo
  const handleZoomChange = (e) => {
    const newZoom = Number(e.target.value);
    setZoomLevel(newZoom);
    if (trackRef.current) {
      trackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom }]
      }).catch(err => console.error("Error aplicando zoom", err));
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans overflow-hidden">
      {/* Cabecera */}
      <div className="flex justify-between items-center p-6 text-white absolute top-0 w-full z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-black tracking-widest text-sm uppercase shadow-black drop-shadow-md">Escaneando</span>
        </div>
        <button onClick={onClose} className="pointer-events-auto bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          <X size={20} />
        </button>
      </div>

      {/* Pantalla de Error Visual */}
      {errorCamara && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 px-8 text-center bg-black">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <p className="text-white font-bold mb-2 text-lg">No hay acceso a la cámara</p>
          <p className="text-gray-400 text-sm">{errorCamara}</p>
          <button onClick={onClose} className="mt-8 bg-blue-600 text-white font-black px-8 py-4 rounded-2xl active:scale-95 uppercase tracking-widest text-xs shadow-xl">
            Volver al Semáforo
          </button>
        </div>
      )}

      {/* Contenedor principal de la cámara */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative bg-black">
        {/* CSS para forzar que el video ocupe toda la pantalla */}
        <style>{`
          #reader-container video { object-fit: cover !important; width: 100vw !important; height: 100vh !important; }
        `}</style>
        
        <div id="reader-container" className="absolute inset-0 w-full h-full overflow-hidden"></div>
        
        {/* Overlay estético (Puntas azules y línea roja animada) */}
        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[260px] h-[110px] border-2 border-white/10 rounded-xl relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_15px_red] animate-pulse -translate-y-1/2"></div>
          </div>
        </div>
      </div>

      {/* CONTROL DE ZOOM (Solo aparece si el celular lo soporta) */}
      {zoomSupported && (
        <div className="absolute bottom-36 left-0 w-full px-8 z-30 flex justify-center">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 w-full max-w-[280px] shadow-2xl">
            <ZoomIn className="text-gray-300" size={20} />
            <input 
              type="range" 
              min={zoomParams.min} 
              max={zoomParams.max} 
              step={zoomParams.step} 
              value={zoomLevel} 
              onChange={handleZoomChange}
              className="w-full accent-blue-500 bg-gray-600 rounded-lg appearance-none h-1.5"
            />
          </div>
        </div>
      )}

      {/* Instrucciones inferiores */}
      <div className="absolute bottom-0 w-full p-8 text-center bg-gradient-to-t from-black via-black/90 to-transparent z-20 pb-12 pointer-events-none">
        <p className="text-white text-2xl font-black tracking-tight drop-shadow-lg">Enfoca el código</p>
        <p className="text-gray-400 text-[10px] mt-2 uppercase tracking-[0.2em] font-bold drop-shadow-md">Centra las barras en la línea roja</p>
      </div>
    </div>
  );
};

export default Scanner;