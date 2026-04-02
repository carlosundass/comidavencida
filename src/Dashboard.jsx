import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Plus, X, ScanBarcode, ChevronRight } from 'lucide-react';
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

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const agregarItem = () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
    setNuevoProd({ nombre: '', fecha: '', categoria: 'General' });
    setMostrarForm(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-32">
      {/* Header Estilo Moderno */}
      <header className="px-6 pt-12 pb-6 bg-white rounded-b-[3rem] shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900 italic">comidavencida</h1>
            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mt-1">Mi Despensa Inteligente</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Clock size={24} strokeWidth={2.5} />
          </div>
        </div>
      </header>

      {/* Lista de Alimentos */}
      <main className="px-6 mt-8 space-y-4">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest">Inventario</h2>
          <span className="text-[10px] font-bold bg-gray-200 px-2 py-1 rounded-md">{productos.length} items</span>
        </div>

        {productos.length === 0 && (
          <div className="py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Plus size={32} />
            </div>
            <p className="text-gray-400 font-bold text-center px-10">Tu despensa está vacía.<br/>Comienza escaneando algo.</p>
          </div>
        )}

        {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
          const dias = calcularDias(p.fecha);
          const esUrgente = dias <= 3;
          
          return (
            <div key={p.id} className="bg-white p-5 rounded-[2.2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-gray-50 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-black text-lg text-gray-800 leading-tight mb-1">{p.nombre}</h3>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${esUrgente ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Vence el {p.fecha}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 border-l pl-4 border-gray-50">
                <div className="text-center">
                  <span className={`block text-2xl font-black leading-none ${esUrgente ? 'text-red-500' : 'text-gray-800'}`}>{dias}</span>
                  <span className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">días</span>
                </div>
                <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-gray-200 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </main>

      {/* Barra de Navegación / Botón Inferior */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB] to-transparent">
        <button 
          onClick={() => setMostrarForm(true)}
          className="w-full bg-black text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <Plus size={20} strokeWidth={4} /> Agregar Alimento
        </button>
      </div>

      {/* Modal Formulario Estilo Apple */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black tracking-tighter italic">Nuevo Producto</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-6">
              <button 
                onClick={() => { setMostrarForm(false); setMostrarScanner(true); }}
                className="w-full flex items-center justify-between bg-blue-600 text-white p-6 rounded-[2rem] font-black shadow-xl shadow-blue-200 transition-all active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <ScanBarcode size={28} />
                  <span className="tracking-widest">USAR CÁMARA TRASERA</span>
                </div>
                <ChevronRight size={20} />
              </button>

              <div className="space-y-4">
                <input 
                  type="text" placeholder="Nombre (Ej: Jamón Soprole)"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold text-gray-800 transition-all"
                  value={nuevoProd.nombre}
                  onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
                />
                
                <input 
                  type="date"
                  className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:border-blue-500 font-bold text-gray-800 transition-all uppercase"
                  value={nuevoProd.fecha}
                  onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
                />
              </div>

              <button 
                disabled={!nuevoProd.nombre || !nuevoProd.fecha}
                onClick={agregarItem}
                className="w-full bg-black text-white font-black p-6 rounded-[2rem] shadow-xl disabled:opacity-20 transition-all active:scale-95 uppercase tracking-widest text-xs"
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