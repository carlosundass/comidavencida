import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, PawPrint, Pill, AlertTriangle, BookOpen } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  // ==========================================
  // 1. ESTADOS PRINCIPALES Y AUTENTICACIÓN
  // ==========================================
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const guardado = localStorage.getItem('cv_usuario_activo');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [vista, setVista] = useState('landing'); 
  const [modoLogin, setModoLogin] = useState('crear');
  const [inputId, setInputId] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [cargandoAuth, setCargandoAuth] = useState(false);

  // NAVEGACIÓN INFERIOR (TABS)
  const [tabActivo, setTabActivo] = useState('despensa');

  const manejarAcceso = async () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    
    if (idLimpio.length < 3) return setErrorAuth('El ID debe tener al menos 3 letras.');
    if (inputPin.length !== 4) return setErrorAuth('El PIN debe ser de 4 números.');

    setCargandoAuth(true);
    try {
      const despensaRef = doc(db, 'despensas', idLimpio);
      const despensaSnap = await getDoc(despensaRef);

      if (modoLogin === 'crear') {
        if (despensaSnap.exists()) {
          setErrorAuth('Ese nombre ya existe. Elige otro.');
        } else {
          await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() });
          iniciarSesion(idLimpio);
        }
      } else {
        if (!despensaSnap.exists()) {
          setErrorAuth('No encontramos esta cuenta.');
        } else if (despensaSnap.data().pin !== inputPin) {
          setErrorAuth('El PIN es incorrecto.');
        } else {
          iniciarSesion(idLimpio);
        }
      }
    } catch (error) {
      setErrorAuth('Error de conexión. Revisa tu internet.');
      console.error(error);
    } finally {
      setCargandoAuth(false);
    }
  };

  const iniciarSesion = (id) => {
    const dataUsuario = { id };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId('');
    setInputPin('');
    setTabActivo('despensa');
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
    setVista('landing');
  };

  // ==========================================
  // 2. LÓGICA DE LA DESPENSA ORIGINAL
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', codigo: '', fecha: '' });

  useEffect(() => {
    if (usuarioActual) {
      const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
      const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
        const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProductos(datos);
      });
      return () => unsubscribe();
    }
  }, [usuarioActual]);

  const agregarItem = async () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
    await addDoc(itemsRef, {
      nombre: nuevoProd.nombre,
      codigo: nuevoProd.codigo || '',
      fecha: nuevoProd.fecha,
      creadoEn: new Date().getTime()
    });
    setNuevoProd({ nombre: '', codigo: '', fecha: '' });
    setMostrarForm(false);
  };

  const borrarItem = async (itemId) => {
    const itemRef = doc(db, 'despensas', usuarioActual.id, 'items', itemId);
    await deleteDoc(itemRef);
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));
  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // ==========================================
  // 3. LÓGICA DE MASCOTAS (Puntos 1, 2, 3)
  // ==========================================
  const [mascotas, setMascotas] = useState([]);
  const [mostrarFormMascota, setMostrarFormMascota] = useState(false);
  const [nuevaMascota, setNuevaMascota] = useState({ nombre: '', especie: 'Perro', edad: '' });

  useEffect(() => {
    if (usuarioActual) {
      const mascotasRef = collection(db, 'despensas', usuarioActual.id, 'mascotas');
      const unsubscribe = onSnapshot(mascotasRef, (snapshot) => {
        const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMascotas(datos);
      });
      return () => unsubscribe();
    }
  }, [usuarioActual]);

  const agregarMascota = async () => {
    if (!nuevaMascota.nombre) return;
    const mascotasRef = collection(db, 'despensas', usuarioActual.id, 'mascotas');
    await addDoc(mascotasRef, { ...nuevaMascota, creadoEn: new Date().getTime() });
    setNuevaMascota({ nombre: '', especie: 'Perro', edad: '' });
    setMostrarFormMascota(false);
  };

  const borrarMascota = async (id) => {
    const mascotaRef = doc(db, 'despensas', usuarioActual.id, 'mascotas', id);
    await deleteDoc(mascotaRef);
  };

  // ==========================================
  // 4. LÓGICA DE ALARMAS DE MEDICAMENTOS
  // ==========================================
  const [medicamentos, setMedicamentos] = useState([]);
  const [mostrarFormMed, setMostrarFormMed] = useState(false);
  const [nuevoMed, setNuevoMed] = useState({ nombre: '', dosis: '', frecuencia: 'Cada 8 horas' });

  useEffect(() => {
    if (usuarioActual) {
      const medsRef = collection(db, 'despensas', usuarioActual.id, 'medicamentos');
      const unsubscribe = onSnapshot(medsRef, (snapshot) => {
        const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMedicamentos(datos);
      });
      return () => unsubscribe();
    }
  }, [usuarioActual]);

  const agregarMed = async () => {
    if (!nuevoMed.nombre) return;
    const medsRef = collection(db, 'despensas', usuarioActual.id, 'medicamentos');
    await addDoc(medsRef, { ...nuevoMed, creadoEn: new Date().getTime() });
    setNuevoMed({ nombre: '', dosis: '', frecuencia: 'Cada 8 horas' });
    setMostrarFormMed(false);
  };

  const borrarMed = async (id) => {
    const medRef = doc(db, 'despensas', usuarioActual.id, 'medicamentos', id);
    await deleteDoc(medRef);
  };

  // ==========================================
  // RENDER PANTALLA: LANDING / LOGIN
  // ==========================================
  if (!usuarioActual && vista === 'landing') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <header className="p-6 bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-gray-900">comidavencida</h1>
          <button onClick={() => { setVista('login'); setModoLogin('entrar'); }} className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Entrar</button>
        </header>
        <main className="flex-1 p-6 max-w-2xl mx-auto w-full mt-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-4">Evita el desperdicio y <span className="text-blue-600">ahorra dinero</span>.</h2>
            <p className="text-gray-600 font-medium text-lg leading-relaxed mb-8">La herramienta para organizar tu despensa y gestionar a tus mascotas en un solo lugar.</p>
            <button onClick={() => { setVista('login'); setModoLogin('crear'); }} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm flex justify-center items-center gap-2 mb-10 transition-transform">
              Crear espacio Gratis <ArrowRight size={18} />
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest">← Volver</button>
        <div className="w-full max-w-sm mt-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900 italic">comidavencida</h1>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear Nueva</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre de Despensa" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
              <input type="password" maxLength={4} placeholder="PIN (4 núm)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-center text-gray-800 tracking-[0.5em]" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
              {errorAuth && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center">{errorAuth}</div>}
              <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl mt-4">ENTRAR</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA: DASHBOARD (APP REAL CON TABS)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-32 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none italic">comidavencida</h1>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Home size={12} className="text-blue-600" />
            <p className="font-bold text-[10px] uppercase tracking-widest text-gray-800">{usuarioActual.id}</p>
          </div>
        </div>
        <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 hover:text-red-500 shadow-sm"><LogOut size={18} /></button>
      </header>

      <main className="flex-1 px-6 mt-2">
        
        {/* TABS 1: DESPENSA ORIGINAL */}
        {tabActivo === 'despensa' && (
          <div className="animate-in fade-in">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo de Alimentos</h2>
            {productos.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Todo al día</p>
                <p className="text-gray-400 text-sm mt-1">Sincronizado en la nube ☁️</p>
              </div>
            )}
            <div className="space-y-3">
              {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
                const dias = calcularDias(p.fecha);
                const est = obtenerEstado(dias);
                return (
                  <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm ${est.bg} ${est.border}`}>
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
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-50`}>días</span>
                      </div>
                      <button onClick={() => borrarItem(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="fixed bottom-20 left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-30">
              <button onClick={() => setMostrarForm(true)} className="pointer-events-auto mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center border border-gray-100"><Plus size={20} strokeWidth={3} /></button>
              <button onClick={() => setMostrarScanner(true)} className="pointer-events-auto w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3"><ScanBarcode size={24} /> Escanear Código</button>
            </div>
          </div>
        )}

        {/* TAB 2: MASCOTAS */}
        {tabActivo === 'mascotas' && (
          <div className="animate-in fade-in pb-20">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Mis Mascotas</h2>
              <button onClick={() => setMostrarFormMascota(true)} className="text-orange-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><Plus size={14}/> Añadir</button>
            </div>
            {mascotas.length === 0 ? (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]"><p className="text-gray-500 font-bold">Sin mascotas registradas</p></div>
            ) : (
              <div className="space-y-3">
                {mascotas.map((m) => (
                  <div key={m.id} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-gray-900">{m.nombre}</h3>
                      <p className="text-[11px] font-bold text-gray-500 uppercase">{m.especie} • {m.edad} años</p>
                    </div>
                    <button onClick={() => borrarMascota(m.id)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEDICAMENTOS */}
        {tabActivo === 'medicamentos' && (
          <div className="animate-in fade-in pb-20">
            <div className="flex justify-between items-end mb-4 px-1">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Alarmas / Meds</h2>
              <button onClick={() => setMostrarFormMed(true)} className="text-indigo-600 font-bold text-xs uppercase tracking-widest flex items-center gap-1"><Plus size={14}/> Añadir</button>
            </div>
            {medicamentos.length === 0 ? (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]"><p className="text-gray-500 font-bold">Sin medicamentos</p></div>
            ) : (
              <div className="space-y-3">
                {medicamentos.map((med) => (
                  <div key={med.id} className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-lg text-indigo-900">{med.nombre}</h3>
                      <p className="text-[11px] font-bold text-indigo-500 uppercase">Dosis: {med.dosis} • {med.frecuencia}</p>
                    </div>
                    <button onClick={() => borrarMed(med.id)} className="text-indigo-400 hover:text-indigo-600 p-2"><Trash2 size={20} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SOS Y GUÍA */}
        {tabActivo === 'sos' && (
          <div className="animate-in fade-in py-10 text-center">
             <AlertTriangle size={48} className="mx-auto mb-4 text-red-400" />
             <h2 className="text-xl font-black text-red-600 mb-2">Mascota Perdida (SOS)</h2>
             <p className="text-gray-500 text-sm">Generador de alertas y directorio de servicios cercano (Próximamente).</p>
          </div>
        )}

      </main>

      {/* NAVEGACIÓN INFERIOR DE TABS */}
      {usuarioActual && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
          <div className="max-w-md mx-auto flex justify-between px-4 py-3">
            <button onClick={() => setTabActivo('despensa')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'despensa' ? 'text-blue-600' : 'text-gray-400'}`}>
              <Leaf size={22} />
              <span className="text-[9px] font-bold mt-1 uppercase">Despensa</span>
            </button>
            <button onClick={() => setTabActivo('mascotas')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'mascotas' ? 'text-orange-600' : 'text-gray-400'}`}>
              <PawPrint size={22} />
              <span className="text-[9px] font-bold mt-1 uppercase">Mascotas</span>
            </button>
            <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}`}>
              <Pill size={22} />
              <span className="text-[9px] font-bold mt-1 uppercase">Meds</span>
            </button>
            <button onClick={() => setTabActivo('sos')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'sos' ? 'text-red-600' : 'text-gray-400'}`}>
              <AlertTriangle size={22} />
              <span className="text-[9px] font-bold mt-1 uppercase">SOS</span>
            </button>
          </div>
        </nav>
      )}

      {/* MODALES DE CREACIÓN */}
      
      {/* Modal Despensa Original */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">Ingresar Alimento</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre (Ej: Leche)" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <input type="text" placeholder="Código (Opcional)" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoProd.codigo} onChange={(e) => setNuevoProd({...nuevoProd, codigo: e.target.value})} />
              <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl font-bold uppercase" value={nuevoProd.fecha} onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
              <button disabled={!nuevoProd.nombre || !nuevoProd.fecha} onClick={agregarItem} className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Mascotas */}
      {mostrarFormMascota && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMostrarFormMascota(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">Nueva Mascota</h2>
              <button onClick={() => setMostrarFormMascota(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevaMascota.nombre} onChange={(e) => setNuevaMascota({...nuevaMascota, nombre: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevaMascota.especie} onChange={(e) => setNuevaMascota({...nuevaMascota, especie: e.target.value})}>
                <option value="Perro">Perro 🐶</option>
                <option value="Gato">Gato 🐱</option>
                <option value="Otro">Otro 🐇</option>
              </select>
              <input type="number" placeholder="Edad (años)" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevaMascota.edad} onChange={(e) => setNuevaMascota({...nuevaMascota, edad: e.target.value})} />
              <button disabled={!nuevaMascota.nombre} onClick={agregarMascota} className="w-full bg-orange-600 text-white font-black p-5 rounded-2xl">Guardar Mascota</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Medicamentos */}
      {mostrarFormMed && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMostrarFormMed(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">Nuevo Medicamento</h2>
              <button onClick={() => setMostrarFormMed(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Medicamento" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoMed.nombre} onChange={(e) => setNuevoMed({...nuevoMed, nombre: e.target.value})} />
              <input type="text" placeholder="Dosis (Ej: 1 pastilla)" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoMed.dosis} onChange={(e) => setNuevoMed({...nuevoMed, dosis: e.target.value})} />
              <select className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoMed.frecuencia} onChange={(e) => setNuevoMed({...nuevoMed, frecuencia: e.target.value})}>
                <option value="Cada 8 horas">Cada 8 horas</option>
                <option value="Cada 12 horas">Cada 12 horas</option>
                <option value="Una vez al día">Una vez al día</option>
              </select>
              <button disabled={!nuevoMed.nombre} onClick={agregarMed} className="w-full bg-indigo-600 text-white font-black p-5 rounded-2xl">Guardar Alarma</button>
            </div>
          </div>
        </div>
      )}

      {/* Componente Escáner */}
      {mostrarScanner && (
        <Scanner onScan={(codigoDetectado) => {
            setNuevoProd({ nombre: '', codigo: codigoDetectado, fecha: '' });
            setMostrarScanner(false);
            setMostrarForm(true);
          }} onClose={() => setMostrarScanner(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;