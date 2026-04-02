import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Plus, X, ScanBarcode, Utensils, ChevronRight } from 'lucide-react';
import Scanner from './Scanner';

const Dashboard = () => {
  const [productos, setProductos] = useState(() => {
    const guardados = localStorage.getItem('comidavencida_datos');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [cargandoAPI, setCargandoAPI] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '', categoria: 'General' });

  useEffect(() => {
    localStorage.setItem('comidavencida_datos', JSON.stringify(productos));
  }, [productos]);

  const buscarProductoEnAPI = async (codigo) => {
    setCargandoAPI(true);
    setNuevoProd(prev => ({ ...prev, nombre: 'Buscando...' }));
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const nombre = data.product.product_name || "";
        const marca = data.product.brands || "";
        setNuevoProd(prev => ({ ...prev, nombre: `${nombre} ${marca}`.trim() }));
      } else {
        setNuevoProd(prev => ({ ...prev, nombre: '' })); // Si no lo halla, deja vacío para que tú escribas
      }
    } catch (err) {
      setNuevoProd(prev => ({ ...prev, nombre: '' }));
    } finally {
      setCargandoAPI(false);
    }
  };

  const manejarEscaneo = (codigo) => {
    setMostrarScanner(false);
    setMostrarForm(true);
    buscarProductoEnAPI(codigo);
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstilo = (d) => {
    if (d <= 2) return "bg-red-50 border-red-200 text-red-900";
    if (d <= 5) return "bg-orange-50 border-orange-200 text-orange-900";
    return "bg-gray-50 border-gray-100 text-gray-900";
  };

  return (
    <div className="p-6 pb-32 min-h-screen bg-white font-sans text-gray-900">
      <header className="flex justify-between items-center mb-10 pt-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter italic leading-none">comidavencida</h1>
          <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Smart Pantry v1.0</p>
        </div>
        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
          <Utensils size={20} />
        </div>
      </header>

      {/* LISTA DE PRODUCTOS */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mi Inventario</h2>
        
        {productos.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[2.5rem]">
            <p className="text-gray-300 font-bold px-10 leading-tight">Escanea tu primer producto para no botar más comida.</p>
          </div>
        )}

        {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
          const dias = calcularDias(p.fecha);
          const estilo = obtenerEstilo(dias);
          return (
            <div key={p.id} className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between ${estilo}`}>
              <div className="flex-1 pr-4">
                <h3 className="font-black text-lg leading-tight mb-1">{p.nombre}</h3>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dias <= 2 ? 'bg-red-500' : dias <= 5 ? 'bg-orange-400' : 'bg-green-500'}`}></span>
                  <p className="text-[10px] font-bold uppercase opacity-60">Vence el {p.fecha}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-2xl font-black leading-none">{dias}</p>
                  <p className="text-[8px] font-black uppercase tracking-tighter">días</p>
                </div>
                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* BOTÓN FLOTANTE ESTILO IPHONE */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none">
        <button 
          onClick={() => setMostrarForm(true)}
          className="pointer-events-auto w-full bg-black text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <Plus size={24} strokeWidth={3} /> Agregar Alimento
        </button>
      </div>

      {/* MODAL DE FORMULARIO (MÁS AMIGABLE) */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tight italic">Nuevo Producto</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <button 
                onClick={() => { setMostrarForm(false); setMostrarScanner(true); }}
                className="w-full flex items-center justify-between bg-blue-50 text-blue-600 p-6 rounded-[2rem] font-black border-2 border-blue-100 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <ScanBarcode size={28} strokeWidth={2.5} />
                  <span>USAR CÁMARA TRASERA</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">¿Qué comida es?</label>
                  <input 
                    type="text" placeholder="Ej: Leche Colun Descremada"
                    className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold text-gray-800 transition-all"
                    value={nuevoProd.nombre}
                    onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-2 block">¿Cuándo vence?</label>
                  <input 
                    type="date"
                    className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold text-gray-800 transition-all uppercase"
                    value={nuevoProd.fecha}
                    onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
                  />
                </div>
              </div>

              <button 
                disabled={!nuevoProd.nombre || !nuevoProd.fecha}
                onClick={() => {
                  setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
                  setNuevoProd({ nombre: '', fecha: '', categoria: 'General' });
                  setMostrarForm(false);
                }}
                className="w-full bg-black text-white font-black p-6 rounded-[2rem] shadow-xl disabled:opacity-20 transition-all active:scale-95 uppercase tracking-widest text-sm"
              >
                Guardar en Despensa
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && <Scanner onScan={manejarEscaneo} onClose={() => setMostrarScanner(false)} />}
    </div>
  );
};

export default Dashboard;