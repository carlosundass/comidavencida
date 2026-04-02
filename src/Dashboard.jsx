import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Plus, X, ScanBarcode, ChevronRight, Utensils } from 'lucide-react';
import Scanner from './Scanner';

const Dashboard = () => {
  const [productos, setProductos] = useState(() => {
    const guardados = localStorage.getItem('comidavencida_datos');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '', categoria: 'General' });

  useEffect(() => {
    localStorage.setItem('comidavencida_datos', JSON.stringify(productos));
  }, [productos]);

  const calcularDias = (f) => {
    const d = Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));
    return d;
  };

  const obtenerColor = (d) => {
    if (d <= 2) return "bg-red-50 border-red-100 text-red-900 shadow-red-100";
    if (d <= 5) return "bg-amber-50 border-amber-100 text-amber-900 shadow-amber-100";
    return "bg-white border-gray-100 text-gray-900 shadow-gray-100";
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-32">
      {/* HEADER PREMIUM */}
      <header className="px-8 pt-14 pb-8 bg-white rounded-b-[3rem] shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tighter italic text-gray-900">comidavencida</h1>
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-1">Smart Pantry 🇨🇱</p>
          </div>
          <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
            <Utensils size={22} />
          </div>
        </div>
      </header>

      {/* LISTA DE ALIMENTOS */}
      <main className="px-6 mt-10 space-y-4">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">Mi Despensa</h2>
          <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded-lg">{productos.length} items</span>
        </div>

        {productos.length === 0 && (
          <div className="py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Plus className="text-gray-300" size={32} />
            </div>
            <p className="text-gray-400 font-bold text-center px-12 leading-snug">Tu despensa está vacía. Escanea un producto.</p>
          </div>
        )}

        {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
          const dias = calcularDias(p.fecha);
          const estilo = obtenerColor(dias);
          
          return (
            <div key={p.id} className={`p-6 rounded-[2.5rem] border shadow-xl flex items-center justify-between transition-all active:scale-95 ${estilo}`}>
              <div className="flex-1 pr-4">
                <h3 className="font-black text-lg leading-tight mb-1">{p.nombre}</h3>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${dias <= 2 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                  <p className="text-[10px] font-black uppercase opacity-40">Vence: {p.fecha}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="block text-2xl font-black leading-none">{dias}</span>
                  <span className="text-[9px] font-black uppercase opacity-40">días</span>
                </div>
                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-gray-300 hover:text-red-500 p-2">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* BOTÓN FLOTANTE ESTILO APPLE */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB]/90 to-transparent">
        <button 
          onClick={() => setMostrarForm(true)}
          className="w-full bg-black text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={22} strokeWidth={4} /> Agregar Producto
        </button>
      </div>

      {/* MODAL FORMULARIO */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3.5rem] p-10 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black italic tracking-tighter">Nuevo Item</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <button 
                onClick={() => { setMostrarForm(false); setMostrarScanner(true); }}
                className="w-full flex items-center justify-between bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-lg shadow-blue-200 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3 font-bold tracking-tight">
                  <ScanBarcode size={28} />
                  <span>CÁMARA TRASERA</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <div className="space-y-4">
                <input 
                  type="text" placeholder="¿Qué comida es?"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold text-lg"
                  value={nuevoProd.nombre}
                  onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
                />
                <input 
                  type="date"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold uppercase text-sm"
                  value={nuevoProd.fecha}
                  onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
                />
              </div>

              <button 
                disabled={!nuevoProd.nombre || !nuevoProd.fecha}
                onClick={() => {
                  setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
                  setNuevoProd({ nombre: '', fecha: '', categoria: 'General' });
                  setMostrarForm(false);
                }}
                className="w-full bg-black text-white font-black p-6 rounded-[2.2rem] shadow-xl disabled:opacity-20 transition-all uppercase tracking-widest text-xs"
              >
                Guardar en Despensa
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && (
        <Scanner 
          onScan={(codigo) => {
            setNuevoProd({ ...nuevoProd, nombre: `Cod: ${codigo}` });
            setMostrarScanner(false);
            setMostrarForm(true);
          }} 
          onClose={() => setMostrarScanner(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;