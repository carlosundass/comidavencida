import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle, Plus, X, ScanBarcode, ChevronRight, Apple } from 'lucide-react';
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

  const buscarEnAPI = async (codigo) => {
    setCargandoAPI(true);
    setNuevoProd(prev => ({ ...prev, nombre: 'Buscando...' }));
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
      const data = await res.json();
      if (data.status === 1) {
        setNuevoProd(prev => ({ ...prev, nombre: `${data.product.product_name || ''} ${data.product.brands || ''}`.trim() }));
      } else {
        setNuevoProd(prev => ({ ...prev, nombre: `Cod: ${codigo}` }));
      }
    } catch {
      setNuevoProd(prev => ({ ...prev, nombre: `Cod: ${codigo}` }));
    } finally {
      setCargandoAPI(false);
    }
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const agregarItem = () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
    setNuevoProd({ nombre: '', fecha: '', categoria: 'General' });
    setMostrarForm(false);
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* HEADER VIBRANTE */}
      <header className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white px-6 pt-12 pb-8 rounded-b-[2.5rem] shadow-lg relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight">comidavencida</h1>
            <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mt-1">Smart Pantry</p>
          </div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Apple size={24} className="text-white" />
          </div>
        </div>
        
        {/* Widget Resumen */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex justify-between items-center border border-white/20">
          <div>
            <p className="text-blue-100 text-xs font-bold uppercase mb-1">Total Items</p>
            <p className="text-3xl font-black">{productos.length}</p>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-xs font-bold uppercase mb-1">Por vencer</p>
            <p className="text-3xl font-black text-red-300">{productos.filter(p => calcularDias(p.fecha) <= 3).length}</p>
          </div>
        </div>
      </header>

      {/* LISTA DE ALIMENTOS */}
      <main className="flex-1 px-6 pt-6 pb-32 overflow-y-auto">
        <div className="space-y-4">
          {productos.length === 0 && (
            <div className="mt-10 flex flex-col items-center justify-center text-center opacity-60">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={40} className="text-gray-400" />
              </div>
              <h3 className="font-bold text-gray-700 text-lg">Nada por aquí</h3>
              <p className="text-gray-500 text-sm mt-1">Tu despensa está vacía.</p>
            </div>
          )}

          {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
            const dias = calcularDias(p.fecha);
            const esUrgente = dias <= 3;
            
            return (
              <div key={p.id} className="group bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex items-center justify-between transition-all active:scale-95">
                <div className="flex items-center gap-4 flex-1 overflow-hidden">
                  <div className={`w-3 h-12 rounded-full ${esUrgente ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-emerald-400'}`}></div>
                  <div className="flex-1 truncate pr-2">
                    <h3 className="font-black text-[15px] text-gray-800 truncate">{p.nombre}</h3>
                    <p className="text-xs font-bold text-gray-400 mt-0.5">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pl-3 border-l border-gray-100">
                  <div className="text-center min-w-[3rem]">
                    <span className={`block text-xl font-black leading-none ${esUrgente ? 'text-red-600' : 'text-gray-800'}`}>{dias}</span>
                    <span className="text-[9px] font-bold uppercase text-gray-400">días</span>
                  </div>
                  <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* BARRA FLOTANTE (GLASSMORPHISM) */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-20">
        <button 
          onClick={() => setMostrarForm(true)}
          className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={3} /> Agregar Producto
        </button>
      </div>

      {/* MODAL TIPO BOTTOM SHEET */}
      {mostrarForm && (
        <div className="absolute inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-6 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom-full duration-300">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            
            <div className="flex justify-between items-center mb-6 px-2">
              <h2 className="text-xl font-black text-gray-800">Nuevo Producto</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => { setMostrarForm(false); setMostrarScanner(true); }}
                className="w-full flex items-center justify-between bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <ScanBarcode size={24} />
                  <span className="text-sm tracking-widest uppercase">Escanear Código</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <div className="flex items-center gap-4 my-2">
                <hr className="flex-1 border-gray-100" />
                <span className="text-xs font-bold text-gray-300 uppercase">Ingreso Manual</span>
                <hr className="flex-1 border-gray-100" />
              </div>

              <div className="bg-gray-50 p-1 rounded-2xl border border-gray-100">
                <input 
                  type="text" placeholder={cargandoAPI ? "Buscando..." : "¿Qué alimento es?"}
                  className="w-full p-4 bg-transparent outline-none font-bold text-gray-800 placeholder-gray-400"
                  value={nuevoProd.nombre}
                  onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
                  disabled={cargandoAPI}
                />
                <hr className="border-gray-200 mx-4" />
                <input 
                  type="date"
                  className="w-full p-4 bg-transparent outline-none font-bold text-gray-800 uppercase text-sm"
                  value={nuevoProd.fecha}
                  onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
                />
              </div>

              <button 
                disabled={!nuevoProd.nombre || !nuevoProd.fecha}
                onClick={agregarItem}
                className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 disabled:shadow-none transition-all active:scale-95 uppercase tracking-widest text-xs mt-2"
              >
                Guardar en Despensa
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && <Scanner onScan={(cod) => { buscarEnAPI(cod); setMostrarScanner(false); setMostrarForm(true); }} onClose={() => setMostrarScanner(false)} />}
    </div>
  );
};

export default Dashboard;