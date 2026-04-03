import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, ChefHat, Sparkles, Plus } from 'lucide-react';
import Scanner from './Scanner';

const Dashboard = () => {
  const [productos, setProductos] = useState(() => {
    const guardados = localStorage.getItem('comidavencida_datos');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '' });

  useEffect(() => {
    localStorage.setItem('comidavencida_datos', JSON.stringify(productos));
  }, [productos]);

  // 1. CÁLCULO DE DÍAS
  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  // 2. SEMÁFORO DE URGENCIA (Colores Premium)
  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // 3. INTELIGENCIA ANTIDESPERDICIO (Hacks de Recetas)
  const generarHackReceta = () => {
    const porVencer = productos.filter(p => {
      const d = calcularDias(p.fecha);
      return d >= 0 && d <= 3;
    });

    if (porVencer.length === 0) return null;

    const nombres = porVencer.map(p => p.nombre.toLowerCase());
    
    let sugerencia = "¡Ponte creativo! Haz una tortilla o salteado con lo que está por vencer.";
    
    if (nombres.some(n => n.includes('leche') || n.includes('huevo') || n.includes('yogur'))) {
      sugerencia = "¡Ideal para hacer una Leche Asada casera o unos panqueques hoy mismo!";
    } else if (nombres.some(n => n.includes('verdura') || n.includes('zapallo') || n.includes('zanahoria') || n.includes('espinaca'))) {
      sugerencia = "¡Un Budín de Verduras o una crema caliente te salvan la cena!";
    } else if (nombres.some(n => n.includes('carne') || n.includes('pollo') || n.includes('vienesa'))) {
      sugerencia = "¡Arma un salteado rápido con arroz o unos tallarines salvadores!";
    } else if (nombres.some(n => n.includes('pan'))) {
      sugerencia = "¡Haz unas tostadas francesas o ralla el pan para empanar!";
    }

    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-5 shadow-lg mb-6 text-white relative overflow-hidden">
        <Sparkles className="absolute top-2 right-2 text-yellow-300 opacity-50" size={40} />
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <ChefHat size={20} className="text-yellow-300" />
          <h3 className="font-black text-sm uppercase tracking-widest text-yellow-300">Hack de Recetas</h3>
        </div>
        <p className="font-bold text-sm relative z-10 leading-snug">{sugerencia}</p>
      </div>
    );
  };

  const agregarItem = () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
    setNuevoProd({ nombre: '', fecha: '' });
    setMostrarForm(false);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      
      {/* HEADER MINIMALISTA */}
      <header className="px-6 pt-12 pb-4">
        <h1 className="text-3xl font-black tracking-tighter text-gray-900">comidavencida</h1>
        <p className="text-gray-500 font-bold text-[11px] uppercase tracking-widest mt-1">Smart Pantry 🇨🇱</p>
      </header>

      <main className="flex-1 px-6 mt-2">
        {/* WIDGET INTELIGENTE */}
        {generarHackReceta()}

        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo</h2>

        {/* LISTA VACÍA */}
        {productos.length === 0 && (
          <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
            <p className="text-gray-500 font-bold text-lg">Todo al día</p>
            <p className="text-gray-400 text-sm mt-1">Escanea tu primera compra.</p>
          </div>
        )}

        {/* TARJETAS SEMÁFORO */}
        <div className="space-y-3">
          {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
            const dias = calcularDias(p.fecha);
            const est = obtenerEstado(dias);
            
            return (
              <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between transition-all ${est.bg} ${est.border}`}>
                <div className="flex-1 pr-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px]">{est.icono}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                  </div>
                  <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {p.nombre}
                  </h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                </div>
                
                <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                  <div className="text-center min-w-[3rem]">
                    <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${est.text}`}>{dias < 0 ? 'días' : 'días'}</span>
                  </div>
                  <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* INGRESO ULTRA RÁPIDO (ONE-HANDED USE) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB] to-transparent z-20 flex flex-col gap-3">
        {/* Botón secundario de ingreso manual */}
        <button 
          onClick={() => setMostrarForm(true)}
          className="mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-all border border-gray-100"
          aria-label="Agregar manual"
        >
          <Plus size={20} strokeWidth={3} />
        </button>
        
        {/* Botón principal ESCANEAR en primer plano */}
        <button 
          onClick={() => setMostrarScanner(true)}
          className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all"
        >
          <ScanBarcode size={24} /> Escanear Código
        </button>
      </div>

      {/* MODAL MANUAL (BOTTOM SHEET) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 italic">Ingreso Manual</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            
            <div className="space-y-4">
              <input 
                type="text" placeholder="Ej: Salsa de Tomate"
                className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ring-blue-200 font-bold text-gray-800 text-lg transition-all"
                value={nuevoProd.nombre}
                onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
              />
              <input 
                type="date"
                className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ring-blue-200 font-bold text-gray-800 text-sm uppercase transition-all"
                value={nuevoProd.fecha}
                onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
              />

              <button 
                disabled={!nuevoProd.nombre || !nuevoProd.fecha}
                onClick={agregarItem}
                className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 active:scale-95 uppercase tracking-widest text-xs mt-2"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ESCÁNER */}
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