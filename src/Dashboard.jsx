import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, CheckCircle, Clock, Plus, X, ScanBarcode, Utensils } from 'lucide-react';
import Scanner from './Scanner';

const Dashboard = () => {
  const [productos, setProductos] = useState(() => {
    const guardados = localStorage.getItem('comidavencida_datos');
    return guardados ? JSON.parse(guardados) : [];
  });

  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [recetaSugerida, setRecetaSugerida] = useState(null);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '', categoria: 'General' });

  useEffect(() => {
    localStorage.setItem('comidavencida_datos', JSON.stringify(productos));
    analizarRecetas();
  }, [productos]);

  // --- LÓGICA DE RECETAS INTELIGENTES ---
  const analizarRecetas = () => {
    const porVencer = productos.filter(p => calcularDias(p.fecha) <= 5);
    if (porVencer.length === 0) {
      setRecetaSugerida(null);
      return;
    }

    const nombres = porVencer.map(p => p.nombre.toLowerCase()).join(' ');

    // Diccionario de recetas chilenas rápidas
    if (nombres.includes('leche') || nombres.includes('huevo')) {
      setRecetaSugerida({ titulo: "Leche Asada o Flan", ingrediente: "la Leche/Huevos" });
    } else if (nombres.includes('arroz') || nombres.includes('pollo')) {
      setRecetaSugerida({ titulo: "Arroz con Pollo", ingrediente: "el Arroz" });
    } else if (nombres.includes('pan') || nombres.includes('tomate')) {
      setRecetaSugerida({ titulo: "Brusquetas o Tostadas", ingrediente: "el Pan" });
    } else if (nombres.includes('fideos') || nombres.includes('pasta')) {
      setRecetaSugerida({ titulo: "Pasta con Salsa", ingrediente: "los Fideos" });
    } else {
      setRecetaSugerida({ titulo: "Guiso de Verduras", ingrediente: "tus productos" });
    }
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const agregarProducto = (e) => {
    if (e) e.preventDefault();
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    setProductos([...productos, { id: Date.now(), ...nuevoProd }]);
    setNuevoProd({ nombre: '', fecha: '', categoria: 'General' });
    setMostrarForm(false);
  };

  return (
    <div className="p-6 relative min-h-screen font-sans bg-white">
      <header className="mb-6 pt-2 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tighter italic">comidavencida</h1>
          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Antidesperdicio 🇨🇱</p>
        </div>
        <div className="bg-gray-100 p-2 rounded-full text-gray-400">
          <Utensils size={20} />
        </div>
      </header>

      {/* SECCIÓN DE RECETA INTELIGENTE (Solo aparece si hay algo por vencer) */}
      {recetaSugerida && (
        <div className="mb-8 p-5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[2rem] text-white shadow-xl shadow-blue-100 animate-pulse-slow">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Utensils size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase opacity-80">Idea para hoy</p>
              <h2 className="text-xl font-black leading-tight">Aprovecha {recetaSugerida.ingrediente} haciendo: <br/> {recetaSugerida.titulo}</h2>
            </div>
          </div>
          <button className="mt-4 w-full py-2 bg-white text-blue-700 rounded-xl font-black text-xs uppercase hover:bg-blue-50 transition-colors">
            Ver receta rápida
          </button>
        </div>
      )}

      {/* LISTA DE ALIMENTOS */}
      <h2 className="text-sm font-black text-gray-400 uppercase mb-4 tracking-widest px-1">Tu Despensa</h2>
      <div className="space-y-3">
        {productos.length === 0 && (
          <div className="text-center py-16 px-6 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-medium">Vacío. ¡Agrega comida!</p>
          </div>
        )}

        {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
          const dias = calcularDias(p.fecha);
          const esUrgente = dias <= 3;
          return (
            <div key={p.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${esUrgente ? 'border-red-500 bg-red-50 shadow-md shadow-red-100' : 'border-gray-50 bg-white shadow-sm'}`}>
              <div className="flex flex-col">
                <h3 className={`font-black text-lg leading-tight ${esUrgente ? 'text-red-900' : 'text-gray-800'}`}>{p.nombre}</h3>
                <p className={`text-[10px] font-bold uppercase ${esUrgente ? 'text-red-500' : 'text-gray-400'}`}>
                   {esUrgente ? '¡Cómelo pronto!' : `Vence en ${dias} días`}
                </p>
              </div>
              <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className={`${esUrgente ? 'text-red-300' : 'text-gray-200'} hover:text-red-500 transition-colors`}>
                <Trash2 size={20} />
              </button>
            </div>
          );
        })}
      </div>

      {/* BOTÓN FLOTANTE */}
      <div className="h-24"></div> {/* Espacio para que el scroll no tape el botón */}
      <button 
        onClick={() => setMostrarForm(true)}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-black text-white px-10 py-5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all z-40 flex items-center gap-3 font-black text-sm tracking-widest uppercase"
      >
        <Plus size={24} strokeWidth={4} /> Agregar
      </button>

      {/* MODAL FORMULARIO (Mismo de antes pero con estilo pulido) */}
      {mostrarForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">Añadir</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              <button 
                onClick={() => { setMostrarForm(false); setMostrarScanner(true); }}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white p-5 rounded-2xl font-black shadow-lg"
              >
                <ScanBarcode size={24} /> ESCANEAR CÓDIGO
              </button>

              <input 
                type="text" placeholder="Nombre (Ej: Jamón Soprole)"
                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold"
                value={nuevoProd.nombre}
                onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})}
              />
              
              <input 
                type="date"
                className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl font-bold uppercase text-xs"
                value={nuevoProd.fecha}
                onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})}
              />

              <button 
                onClick={agregarProducto}
                className="w-full bg-black text-white font-black p-5 rounded-2xl shadow-xl active:scale-95 transition-all"
              >
                GUARDAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCANNER */}
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