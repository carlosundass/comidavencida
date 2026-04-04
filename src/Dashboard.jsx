import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, ChefHat, Sparkles, Plus, LogOut, Lock, Home } from 'lucide-react';
import Scanner from './Scanner';
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos Gemini con tu llave
const genAI = new GoogleGenerativeAI("AIzaSyDNLXITHL9DeicbOcPtUqKi6aJKisW7Vh4");

const Dashboard = () => {
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
          setErrorAuth('Ese nombre ya existe');
        } else {
          await setDoc(despensaRef, { pin: inputPin });
          iniciarSesion(idLimpio);
        }
      } else {
        if (!despensaSnap.exists() || despensaSnap.data().pin !== inputPin) {
          setErrorAuth('Datos incorrectos');
        } else {
          iniciarSesion(idLimpio);
        }
      }
    } catch (e) { setErrorAuth('Error de red'); } finally { setCargandoAuth(false); }
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

  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', fecha: '' });

  useEffect(() => {
    if (usuarioActual) {
      const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
      return onSnapshot(itemsRef, (snap) => {
        setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const borrarItem = async (id) => {
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, 'items', id));
  };

  // ==========================================
  // LÓGICA DE IA (NUEVA VERSIÓN 2026)
  // ==========================================
  const [recetaIA, setRecetaIA] = useState(null);
  const [cargandoIA, setCargandoIA] = useState(false);

  const generarRecetaMagica = async () => {
    const porVencer = productos.filter(p => {
      const d = Math.ceil((new Date(p.fecha) - new Date()) / (1000 * 60 * 60 * 24));
      return d >= 0 && d <= 7;
    });

    if (porVencer.length === 0) return;
    const ingredientes = porVencer.map(p => p.nombre).join(', ');
    
    setCargandoIA(true);
    try {
      // FORZAMOS EL MODELO FLASH 1.5 QUE ES EL ESTÁNDAR ACTUAL
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Chef chileno experto. Tengo esto: ${ingredientes}. 
      Dame una idea de receta rápida y casera en 3 líneas máximo. Tono chileno.`;

      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      setRecetaIA(text);
    } catch (error) {
      console.error(error);
      // Si falla, mostramos un mensaje amigable pero intentamos limpiar el error
      setRecetaIA("¡El Chef IA se fue a la feria! Revisa tu API Key o intenta en un momento.");
    } finally {
      setCargandoIA(false);
    }
  };

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-red-50', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-orange-50', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-green-50', text: 'text-green-700', icono: '🟢' };
  };

  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10 italic font-black text-4xl">comidavencida</div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-6">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'crear' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Crear</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'entrar' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Entrar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre Despensa" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={e => setInputId(e.target.value)} />
              <input type="password" placeholder="PIN (4 n°)" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-center tracking-widest" value={inputPin} onChange={e => setInputPin(e.target.value)} />
              <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-xs">{cargandoAuth ? '...' : 'Entrar'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-40">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <h1 className="text-2xl font-black italic">comidavencida</h1>
        <button onClick={cerrarSesion} className="bg-white p-2.5 rounded-full shadow-sm text-gray-400"><LogOut size={18} /></button>
      </header>

      <main className="px-6">
        {productos.filter(p => Math.ceil((new Date(p.fecha)-new Date())/(1000*60*60*24)) <= 7).length > 0 && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] p-6 shadow-lg mb-6 text-white relative">
            <Sparkles className="absolute top-2 right-2 text-yellow-300 opacity-50" />
            <h3 className="font-black text-xs uppercase tracking-widest text-yellow-300 mb-2 flex items-center gap-2"><ChefHat size={16}/> Chef IA</h3>
            {recetaIA ? (
              <div className="animate-in fade-in duration-500">
                <p className="font-bold text-sm leading-snug">"{recetaIA}"</p>
                <button onClick={() => setRecetaIA(null)} className="mt-3 text-[10px] uppercase font-black opacity-70">← Otra idea</button>
              </div>
            ) : (
              <div>
                <p className="font-bold text-sm mb-4">¿Qué cocinamos con lo que vence pronto?</p>
                <button onClick={generarRecetaMagica} disabled={cargandoIA} className="bg-white text-indigo-600 font-black text-[10px] uppercase px-6 py-3 rounded-xl w-full shadow-lg active:scale-95 transition-all">
                  {cargandoIA ? 'Pensando...' : 'Generar Receta ✨'}
                </button>
              </div>
            )}
          </div>
        )}

        <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Tu Semáforo</h2>
        <div className="space-y-3">
          {productos.sort((a,b) => new Date(a.fecha)-new Date(b.fecha)).map(p => {
            const d = Math.ceil((new Date(p.fecha)-new Date())/(1000*60*60*24));
            const est = obtenerEstado(d);
            return (
              <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between ${est.bg} border-black/5`}>
                <div className="flex-1">
                  <span className={`text-[8px] font-black uppercase ${est.text}`}>{est.icono} {est.titulo}</span>
                  <h3 className={`font-black text-lg ${d < 0 ? 'opacity-30 line-through' : ''}`}>{p.nombre}</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                </div>
                <div className="flex items-center gap-4 border-l border-black/5 pl-4">
                  <div className="text-center">
                    <span className={`block text-2xl font-black ${est.text}`}>{Math.abs(d)}</span>
                    <span className={`text-[8px] font-black uppercase opacity-50`}>días</span>
                  </div>
                  <button onClick={() => borrarItem(p.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FB] to-transparent flex flex-col gap-3">
        <button onClick={() => setMostrarForm(true)} className="mx-auto w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center border border-gray-100"><Plus/></button>
        <button onClick={() => setMostrarScanner(true)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3"><ScanBarcode size={20} /> Escanear Código</button>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 shadow-2xl relative">
            <h2 className="text-2xl font-black mb-6 italic">Nuevo Item</h2>
            <div className="space-y-4">
              <input type="text" placeholder="¿Qué es?" className="w-full p-5 bg-gray-50 rounded-2xl font-bold" value={nuevoProd.nombre} onChange={e => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              <input type="date" className="w-full p-5 bg-gray-50 rounded-2xl font-bold uppercase text-xs" value={nuevoProd.fecha} onChange={e => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
              <button onClick={agregarItem} className="w-full bg-black text-white font-black p-5 rounded-2xl uppercase text-xs">Guardar ✅</button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && (
        <Scanner onScan={(c) => { setNuevoProd({ ...nuevoProd, nombre: `Cod: ${c}` }); setMostrarScanner(false); setMostrarForm(true); }} onClose={() => setMostrarScanner(false)} />
      )}
    </div>
  );
};

export default Dashboard;