import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Bell } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
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

  // ==========================================
  // LÓGICA DE NOTIFICACIONES LOCALES
  // ==========================================
  const solicitarPermisoNotificaciones = async () => {
    if (!("Notification" in window)) {
      alert("Este navegador no soporta notificaciones de escritorio");
      return;
    }

    if (Notification.permission !== "granted") {
      const permiso = await Notification.requestPermission();
      if (permiso === "granted") {
        new Notification("¡Excelente!", {
          body: "Ahora recibirás alertas de tus alimentos por vencer cuando tengas la app abierta.",
          icon: "/vite.svg"
        });
      }
    } else {
      alert("Las notificaciones ya están activadas ✅");
    }
  };

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
        if (despensaSnap.exists()) setErrorAuth('Ese nombre ya existe.');
        else {
          await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() });
          iniciarSesion(idLimpio);
        }
      } else {
        if (!despensaSnap.exists() || despensaSnap.data().pin !== inputPin) setErrorAuth('PIN incorrecto.');
        else iniciarSesion(idLimpio);
      }
    } catch (e) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id) => {
    setUsuarioActual({ id });
    localStorage.setItem('cv_usuario_activo', JSON.stringify({ id }));
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
    setVista('landing');
  };

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
      nombre: nuevoProd.nombre, fecha: nuevoProd.fecha, creadoEn: Date.now()
    });
    setNuevoProd({ nombre: '', fecha: '' });
    setMostrarForm(false);
  };

  const borrarItem = async (id) => await deleteDoc(doc(db, 'despensas', usuarioActual.id, 'items', id));
  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // --- RENDER PANTALLAS ---
  if (!usuarioActual && vista === 'landing') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <header className="p-6 bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-gray-900">comidavencida</h1>
          <button onClick={() => setVista('login')} className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full">
            Entrar a mi despensa
          </button>
        </header>
        <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <div className="text-center mt-8 mb-10">
            <h2 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-4">Evita el desperdicio y <span className="text-blue-600">ahorra dinero</span>.</h2>
            <p className="text-gray-600 font-medium text-lg">Organiza tu refrigerador y recibe alertas visuales de caducidad.</p>
          </div>
          <div className="space-y-4 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-full h-fit"><DollarSign size={24} /></div>
              <div><h3 className="font-black text-gray-900 mb-1">Ahorro Inteligente</h3><p className="text-gray-500 text-sm">Reduce el gasto en alimentos que terminan en la basura.</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full h-fit"><Bell size={24} /></div>
              <div><h3 className="font-black text-gray-900 mb-1">Alertas en Tiempo Real</h3><p className="text-gray-500 text-sm">Recibe notificaciones en tu dispositivo antes de que sea tarde.</p></div>
            </div>
          </div>
          <button onClick={() => setVista('login')} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase text-sm flex justify-center items-center gap-2 mb-10">
            Comenzar Gratis <ArrowRight size={18} />
          </button>
        </main>
      </div>
    );
  }

  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest">← Volver</button>
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900 italic">comidavencida</h1>
            <p className="text-blue-600 font-bold text-xs uppercase mt-2">Acceso a Despensa</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Crear</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre Despensa" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={e => setInputId(e.target.value)} />
              <input type="password" placeholder="PIN (4 números)" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-center tracking-[0.5em]" value={inputPin} onChange={e => setInputPin(e.target.value.replace(/\D/g, ''))} />
              <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl uppercase text-sm mt-4">{cargandoAuth ? '...' : 'Entrar ✅'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black italic">comidavencida</h1>
          <p className="font-bold text-[10px] uppercase text-blue-600">Refri: {usuarioActual.id}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={solicitarPermisoNotificaciones} className="bg-blue-50 text-blue-600 p-2.5 rounded-full shadow-sm active:scale-95 transition-all"><Bell size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border p-2.5 rounded-full shadow-sm text-gray-400 active:scale-95"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2">
        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo</h2>
        <div className="space-y-3">
          {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
            const dias = calcularDias(p.fecha);
            const est = obtenerEstado(dias);
            return (
              <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm ${est.bg} ${est.border}`}>
                <div className="flex-1 pr-2">
                  <span className={`text-[9px] font-black uppercase ${est.text}`}>{est.icono} {est.titulo}</span>
                  <h3 className="font-black text-[16px]">{p.nombre}</h3>
                  <p className="text-[10px] font-bold text-gray-400">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                </div>
                <div className="flex items-center gap-3 pl-3 border-l border-black/10 text-center min-w-[3rem]">
                  <div>
                    <span className={`block text-2xl font-black ${est.text}`}>{Math.abs(dias)}</span>
                    <span className="text-[8px] font-black uppercase opacity-50">días</span>
                  </div>
                  <button onClick={() => borrarItem(p.id)} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Publicidad */}
        <div className="mt-8 mb-10 flex justify-center w-full">
          <div className="w-[320px] h-[50px] bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
            <ins className="adsbygoogle" style={{ display: 'inline-block', width: '320px', height: '50px' }} data-ad-client="ca-pub-3386079946838939" data-ad-slot="TU_SLOT_AQUI"></ins>
          </div>
        </div>
      </main>

      {/* Botones Flotantes */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] to-transparent z-30 flex flex-col gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col gap-3">
          <button onClick={() => setMostrarForm(true)} className="mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center border hover:bg-gray-50"><Plus size={20} strokeWidth={3} /></button>
          <button onClick={() => setMostrarScanner(true)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"><ScanBarcode size={24} /> Escanear Código</button>
        </div>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <h2 className="text-2xl font-black italic mb-6">Ingreso Manual</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Ej: Salsa de Tomate" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold uppercase text-xs" value={nuevoProd.fecha} onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
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