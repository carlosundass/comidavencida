import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  // ==========================================
  // 1. SISTEMA DE AUTENTICACIÓN
  // ==========================================
  const [usuarioActual, setUsuarioActual] = useState(() => {
    const guardado = localStorage.getItem('cv_usuario_activo');
    return guardado ? JSON.parse(guardado) : null;
  });

  const [modoLogin, setModoLogin] = useState('crear');
  const [inputId, setInputId] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [errorAuth, setErrorAuth] = useState('');
  const [cargandoAuth, setCargandoAuth] = useState(false);

  const manejarAcceso = async () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    
    if (idLimpio.length < 3) return setErrorAuth('Mínimo 3 letras');
    if (inputPin.length !== 4) return setErrorAuth('PIN de 4 números');

    setCargandoAuth(true);
    try {
      const despensaRef = doc(db, 'despensas', idLimpio);
      const despensaSnap = await getDoc(despensaRef);

      if (modoLogin === 'crear') {
        if (despensaSnap.exists()) {
          setErrorAuth('Esa despensa ya existe.');
        } else {
          await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() });
          iniciarSesion(idLimpio);
        }
      } else {
        if (!despensaSnap.exists() || despensaSnap.data().pin !== inputPin) {
          setErrorAuth('ID o PIN incorrectos.');
        } else {
          iniciarSesion(idLimpio);
        }
      }
    } catch (error) {
      setErrorAuth('Error de red.');
    } finally {
      setCargandoAuth(false);
    }
  };

  const iniciarSesion = (id) => {
    const data = { id };
    setUsuarioActual(data);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(data));
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
  };

  // ==========================================
  // 2. LÓGICA DE PRODUCTOS (FIREBASE)
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '' });

  useEffect(() => {
    if (usuarioActual) {
      const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
      return onSnapshot(itemsRef, (snapshot) => {
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [usuarioActual]);

  const agregarItem = async () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'items'), {
      nombre: nuevoProd.nombre,
      fecha: nuevoProd.fecha,
      creadoEn: Date.now()
    });
    setNuevoProd({ nombre: '', fecha: '' });
    setMostrarForm(false);
  };

  const borrarItem = async (id) => {
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, 'items', id));
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // --- RENDER LOGIN ---
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-black italic text-center mb-10 text-gray-900">comidavencida</h1>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Crear</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="ID Despensa" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={e => setInputId(e.target.value.replace(/\s+/g, ''))} />
              <input type="password" placeholder="PIN (4 números)" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-center tracking-widest" value={inputPin} onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))} />
              <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl uppercase text-xs disabled:opacity-50" disabled={cargandoAuth}>
                {cargandoAuth ? '...' : (modoLogin === 'crear' ? 'Abrir Despensa' : 'Entrar')}
              </button>
              {errorAuth && <p className="text-red-500 text-[10px] font-bold text-center mt-2">{errorAuth}</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DASHBOARD ---
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-56 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight italic">comidavencida</h1>
          <p className="font-bold text-[10px] uppercase text-blue-600">Refri: {usuarioActual.id}</p>
        </div>
        <button onClick={cerrarSesion} className="bg-white border p-2.5 rounded-full shadow-sm text-gray-400"><LogOut size={18} /></button>
      </header>

      <main className="flex-1 px-6 mt-2">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo</h2>
        <div className="space-y-3">
          {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map(p => {
            const dias = calcularDias(p.fecha);
            const est = obtenerEstado(dias);
            return (
              <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm transition-all ${est.bg} ${est.border}`}>
                <div className="flex-1 pr-2">
                  <span className={`text-[9px] font-black uppercase ${est.text}`}>{est.icono} {est.titulo}</span>
                  <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.nombre}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                </div>
                <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                  <div className="text-center min-w-[3rem]">
                    <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                    <span className={`text-[8px] font-black uppercase opacity-50`}>días</span>
                  </div>
                  <button onClick={() => borrarItem(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ÁREA DE PUBLICIDAD (SECCIÓN FIJA ANTES DE LOS BOTONES) */}
      <div className="fixed bottom-32 left-0 right-0 px-6 z-20">
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl h-24 flex items-center justify-center overflow-hidden">
          {/* Reemplaza data-ad-client y data-ad-slot con tus códigos de AdSense */}
          <ins className="adsbygoogle"
               style={{ display: 'block', width: '100%', height: '90px' }}
               data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
               data-ad-slot="XXXXXXXXXX"
               data-ad-format="horizontal"
               data-full-width-responsive="true"></ins>
        </div>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] to-transparent z-30 flex flex-col gap-3">
        <button onClick={() => setMostrarForm(true)} className="mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center border hover:bg-gray-50"><Plus size={20}/></button>
        <button onClick={() => setMostrarScanner(true)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.4)] flex items-center justify-center gap-3 active:scale-95 transition-all"><ScanBarcode size={24} /> Escanear Código</button>
      </div>

      {/* MODAL INGRESO MANUAL */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative z-10">
            <h2 className="text-2xl font-black text-gray-900 italic mb-6">Ingreso Manual</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Ej: Salsa de Tomate" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold uppercase text-xs" value={nuevoProd.fecha} onChange={e => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
              <button onClick={agregarItem} className="w-full bg-black text-white font-black p-5 rounded-2xl uppercase text-xs shadow-lg">Guardar ✅</button>
            </div>
          </div>
        </div>
      )}
      {mostrarScanner && <Scanner onScan={c => { setNuevoProd({...nuevoProd, nombre: `Cod: ${c}`}); setMostrarScanner(false); setMostrarForm(true); }} onClose={() => setMostrarScanner(false)} />}
    </div>
  );
};

export default Dashboard;