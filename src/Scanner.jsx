import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Zap, AlertCircle, ZoomIn, Camera } from 'lucide-react';

const Scanner = ({ onScan, onClose }) => {
  const scannerRef = useRef(null);
  const trackRef = useRef(null);
  const [errorCamara, setErrorCamara] = useState('');
  
  const [zoomSupported, setZoomSupported] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomParams, setZoomParams] = useState({ min: 1, max: 2, step: 0.1 });
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader-container");
    scannerRef.current = html5QrCode;

    const config = {
      fps: 15,
      qrbox: { width: 250, height: 250 }, 
      aspectRatio: 1.0, 
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.QR_CODE
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
      (errorMessage) => { /* Silencio continuo */ }
    ).then(() => {
      const videoElement = document.querySelector('#reader-container video');
      if (videoElement && videoElement.srcObject) {
        const track = videoElement.srcObject.getVideoTracks()[0];
        trackRef.current = track;
        
        if (track.getCapabilities) {
          const capabilities = track.getCapabilities();
          if (capabilities.zoom) {
            setZoomSupported(true);
            setZoomParams({
              min: capabilities.zoom.min || 1,
              max: capabilities.zoom.max || 3,
              step: capabilities.zoom.step || 0.1
            });
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

  const handleZoomChange = (e) => {
    const newZoom = Number(e.target.value);
    setZoomLevel(newZoom);
    if (trackRef.current) {
      trackRef.current.applyConstraints({
        advanced: [{ zoom: newZoom }]
      }).catch(err => console.error("Error aplicando zoom", err));
    }
  };

  const tomarFotoYAnalizar = () => {
    setProcesando(true);
    const video = document.querySelector('#reader-container video');
    
    if (!video) {
      setProcesando(false);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const file = new File([blob], "captura.jpg", { type: "image/jpeg" });
      const hiddenScanner = new Html5Qrcode("hidden-reader-manual");
      
      hiddenScanner.scanFile(file, false)
        .then(decodedText => {
          if (scannerRef.current) {
            scannerRef.current.stop().catch(e=>e);
          }
          onScan(decodedText);
        })
        .catch(err => {
          alert("El código se ve borroso o incompleto. Intenta enfocarlo mejor y vuelve a presionar.");
          setProcesando(false);
        });
    }, 'image/jpeg');
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col font-sans overflow-hidden">
      <div className="flex justify-between items-center p-6 text-white absolute top-0 w-full z-20 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Zap className="text-yellow-400" size={20} />
          <span className="font-black tracking-widest text-sm uppercase shadow-black drop-shadow-md">Escaneando</span>
        </div>
        <button onClick={onClose} className="pointer-events-auto bg-white/20 p-2.5 rounded-full hover:bg-white/30 transition-colors backdrop-blur-md">
          <X size={20} />
        </button>
      </div>

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

      <div className="flex-1 w-full h-full flex items-center justify-center relative bg-black">
        <style>{`
          #reader-container video { object-fit: cover !important; width: 100vw !important; height: 100vh !important; }
        `}</style>
        <div id="reader-container" className="absolute inset-0 w-full h-full overflow-hidden"></div>
        <div id="hidden-reader-manual" className="hidden"></div>

        <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-[260px] h-[260px] border-2 border-white/10 rounded-xl relative">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-xl"></div>
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-xl"></div>
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-xl"></div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-xl"></div>
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-red-500 shadow-[0_0_15px_red] animate-pulse -translate-y-1/2"></div>
          </div>
        </div>
      </div>

      {zoomSupported && (
        <div className="absolute bottom-40 left-0 w-full px-8 z-30 flex justify-center pointer-events-auto">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/20 w-full max-w-[280px] shadow-2xl">
            <ZoomIn className="text-gray-300" size={20} />
            <input type="range" min={zoomParams.min} max={zoomParams.max} step={zoomParams.step} value={zoomLevel} onChange={handleZoomChange} className="w-full accent-blue-500 bg-gray-600 rounded-lg appearance-none h-1.5" />
          </div>
        </div>
      )}

      <div className="absolute bottom-0 w-full p-8 flex flex-col items-center bg-gradient-to-t from-black via-black/90 to-transparent z-20 pb-12 pointer-events-auto">
        <button onClick={tomarFotoYAnalizar} disabled={procesando} className="mb-4 bg-white text-black font-black px-10 py-4 rounded-[2rem] shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50">
          <Camera size={24} />
          {procesando ? "Analizando..." : "Escanear"}
        </button>
        <p className="text-gray-400 text-[10px] uppercase tracking-[0.2em] font-bold drop-shadow-md text-center">Se detectará solo, o presiona el botón</p>
      </div>
    </div>
  );
};

export default Scanner;