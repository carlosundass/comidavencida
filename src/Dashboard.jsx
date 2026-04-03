import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, ChefHat, Sparkles, Plus, LogOut, Lock, Home } from 'lucide-react';
import Scanner from './Scanner';

const Dashboard = () => {
  // ==========================================
  // 1. SISTEMA DE AUTENTICACIÓN (ID + PIN)
  // ==========================================
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const guardado = localStorage.getItem('cv_usuario_activo');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [modoLogin, setModoLogin] = useState('crear'); // 'crear' o 'entrar'
  const [inputId, setInputId] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [errorAuth, setErrorAuth] = useState('');

  const manejarAcceso = () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    
    if (idLimpio.length < 3) return setErrorAuth('El ID debe tener al menos 3 letras.');
    if (inputPin.length !== 4) return setErrorAuth('El PIN debe ser de 4 números.');

    // Simulador de Base de Datos Local
    const baseDatosLocal = JSON.parse(localStorage.getItem('cv_usuarios_db')) || {};

    if (modoLogin === 'crear') {
      if (baseDatosLocal[idLimpio]) {
        return setErrorAuth('Ese nombre de despensa ya existe. Elige otro.');
      }
      // Crear nueva despensa
      baseDatosLocal[idLimpio] = inputPin;
      localStorage.setItem('cv_usuarios_db', JSON.stringify(baseDatosLocal));
      iniciarSesion(idLimpio);
    } else {
      // Intentar entrar
      if (!baseDatosLocal[idLimpio]) {
        return setErrorAuth('No encontramos esta despensa.');
      }
      if (baseDatosLocal[idLimpio] !== inputPin) {
        return setErrorAuth('El PIN es incorrecto.');
      }
      iniciarSesion(idLimpio);
    }
  };

  const iniciarSesion = (id) => {
    const dataUsuario = { id };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId('');
    setInputPin('');
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
  };

  // ==========================================
  // 2. LÓGICA DE LA DESPENSA (DASHBOARD)
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '' });

  // Cargar productos SOLO del usuario actual
  useEffect(() => {
    if (usuarioActual) {
      const guardados = localStorage.getItem(`cv_datos_${usuarioActual.id}`);
      setProductos(guardados ? JSON.parse(guardados) : []);
    }
  }, [usuarioActual]);

  // Guardar productos del usuario actual
  useEffect(() => {
    if (usuarioActual) {
      localStorage.setItem(`cv_datos_${usuarioActual.id}`, JSON.stringify(productos));
    }
  }, [productos, usuarioActual]);

  // Cálculos y Diseño
  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

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
    } else if (nombres.some(n => n.includes('verdura') || n.includes('zapallo') || n.includes('zanahoria'))) {
      sugerencia = "¡Un Budín de Verduras o una crema caliente te salvan la cena!";
    } else if (nombres.some(n => n.includes('carne') || n.includes('pollo') || n.includes('vienesa'))) {
      sugerencia = "¡Arma un salteado rápido con arroz o unos tallarines salvadores!";
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


  // ==========================================
  // RENDER PANTALLA DE LOGIN / REGISTRO
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 font-sans">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 italic">comidavencida</h1>
            <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-2">No botes tu dinero a la basura</p>
          </div>

          {/* Tarjeta de Login */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            
            {/* Pestañas (Tabs) */}
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button 
                onClick={() => { setModoLogin('crear'); setErrorAuth(''); }}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Crear Despensa
              </button>
              <button 
                onClick={() => { setModoLogin('entrar'); setErrorAuth(''); }}
                className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                Ingresar
              </button>
            </div>

            <div className="space-y-4">
              {/* Input ID */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1">
                  <Home size={12} /> {modoLogin === 'crear' ? 'Inventa un Nombre' : 'Nombre de tu Despensa'}
                </label>
                <input 
                  type="text" 
                  placeholder="Ej: FamiliaRojas"
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 transition-all"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} // Sin espacios
                />
              </div>

              {/* Input PIN */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1">
                  <Lock size={12} /> {modoLogin === 'crear' ? 'Crea un PIN (4 números)' : 'Tu PIN secreto'}
                </label>
                <input 
                  type="password" 
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="****"
                  className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em] text-gray-800 transition-all"
                  value={inputPin}
                  onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} // Solo números
                />
              </div>

              {errorAuth && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100 animate-in shake">
                  {errorAuth}
                </div>
              )}

              <button 
                onClick={manejarAcceso}
                className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm mt-4 transition-transform"
              >
                {modoLogin === 'crear' ? 'Abrir mi Despensa 🚀' : 'Entrar ✅'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER DEL DASHBOARD (Usuario logueado)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      
      {/* HEADER DASHBOARD */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none">comidavencida</h1>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Home size={12} className="text-blue-600" />
            <p className="font-bold text-[10px] uppercase tracking-widest text-gray-800">{usuarioActual.id}</p>
          </div>
        </div>
        <button 
          onClick={cerrarSesion}
          className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"
          aria-label="Cerrar sesión"
        >
          <LogOut size={18} />
        </button>
      </header>

      <main className="flex-1 px-6 mt-2">
        {generarHackReceta()}

        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo</h2>

        {productos.length === 0 && (
          <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
            <p className="text-gray-500 font-bold text-lg">Todo al día</p>
            <p className="text-gray-400 text-sm mt-1">Escanea tu primera compra.</p>
          </div>
        )}

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
                  <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.nombre}</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                </div>
                
                <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                  <div className="text-center min-w-[3rem]">
                    <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${est.text}`}>{dias < 0 ? 'días' : 'días'}</span>
                  </div>
                  <button onClick={() => setProductos(productos.filter(x => x.id !== p.id))} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* BOTONES INFERIORES */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] via-[#F8F9FB] to-transparent z-20 flex flex-col gap-3">
        <button onClick={() => setMostrarForm(true)} className="mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 border border-gray-100">
          <Plus size={20} strokeWidth={3} />
        </button>
        <button onClick={() => setMostrarScanner(true)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all">
          <ScanBarcode size={24} /> Escanear Código
        </button>
      </div>

      {/* MODAL INGRESO MANUAL */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 italic">Ingreso Manual</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Ej: Salsa de Tomate" className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ring-blue-200 font-bold text-gray-800 text-lg transition-all" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <input type="date" className="w-full p-5 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 ring-blue-200 font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoProd.fecha} onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
              <button disabled={!nuevoProd.nombre || !nuevoProd.fecha} onClick={agregarItem} className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 active:scale-95 uppercase tracking-widest text-xs mt-2">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ESCÁNER */}
      {mostrarScanner && (
        <Scanner onScan={(codigo) => {
            setNuevoProd({ ...nuevoProd, nombre: `Cod: ${codigo}` });
            setMostrarScanner(false);
            setMostrarForm(true);
          }} onClose={() => setMostrarScanner(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;