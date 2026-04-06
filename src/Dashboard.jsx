import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2, Edit2, ShoppingCart, CheckCircle2 } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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
  const [tabActivo, setTabActivo] = useState('comida');

  // Estados para QR y Modales
  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);

  // Estados de datos
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', codigo: '', fecha: '', 
    dosis: '', frecuencia: 8, horaInicio: '08:00', duracion: '7', esSiempre: false 
  });

  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), (s) => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), (s) => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubComp = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), (s) => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubComp(); };
    }
  }, [usuarioActual]);

  const manejarAcceso = async () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    if (idLimpio.length < 3 || inputPin.length !== 4) return setErrorAuth('ID (mín 3) y PIN (4 núm) requeridos.');
    setCargandoAuth(true);
    try {
      const ref = doc(db, 'despensas', idLimpio);
      const snap = await getDoc(ref);
      if (modoLogin === 'crear') {
        if (snap.exists()) setErrorAuth('Esa despensa ya existe.');
        else { await setDoc(ref, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!snap.exists() || snap.data().pin !== inputPin) setErrorAuth('Credenciales incorrectas.');
        else iniciarSesion(idLimpio, inputPin);
      }
    } catch (e) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const user = { id, pin };
    setUsuarioActual(user);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(user));
    setVista('landing');
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
    setVista('landing');
  };

  const abrirEdicion = (item, tipo) => {
    setEditandoId(item.id);
    setNuevoItem({ ...item, tipo });
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const col = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const data = { ...nuevoItem, actualizadoEn: new Date().getTime() };
    
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, col, editandoId), data);
    else await addDoc(collection(db, 'despensas', usuarioActual.id, col), { ...data, creadoEn: new Date().getTime() });
    
    setMostrarForm(false);
    setEditandoId(null);
  };

  const toggleCompra = async (item) => {
    await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado });
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));
  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  const qrData = `CV-LOGIN|${usuarioActual?.id}|${usuarioActual?.pin}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  if (!usuarioActual && vista === 'landing') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <header className="p-6 bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-gray-900">comidavencida</h1>
          <button onClick={() => setVista('login')} className="text-blue-600 font-bold text-[11px] bg-blue-50 px-4 py-2 rounded-full">Entrar</button>
        </header>
        <main className="flex-1 p-6 max-w-2xl mx-auto w-full mt-8 text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-4">Ahorra dinero y evita el desperdicio.</h2>
          <p className="text-gray-600 text-lg mb-8">Gestiona tu despensa y medicamentos en familia.</p>
          <button onClick={() => { setVista('login'); setModoLogin('crear'); }} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 uppercase tracking-widest text-sm transition-transform">Empezar Gratis</button>
        </main>
      </div>
    );
  }

  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest">← Volver</button>
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100 w-full max-w-sm">
          <h1 className="text-3xl font-black text-center mb-6 italic">comidavencida</h1>
          <div className="flex bg-gray-50 rounded-2xl p-1 mb-6">
            <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'crear' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Crear</button>
            <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'entrar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Entrar</button>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="ID Despensa" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={(e) => setInputId(e.target.value)} />
            <input type="password" placeholder="PIN (4 números)" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-center tracking-[0.5em]" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g,''))} />
            <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase tracking-widest text-sm">{cargandoAuth ? '...' : 'Abrir Despensa 🚀'}</button>
          </div>
          <button onClick={() => setMostrarScannerLogin(true)} className="w-full mt-6 border-2 border-dashed border-gray-200 p-4 rounded-2xl text-gray-400 font-bold flex justify-center items-center gap-2"><QrCode size={18}/> Leer Invitación</button>
        </div>
        {mostrarScannerLogin && <Scanner onScan={(qr) => { if(qr.startsWith('CV-LOGIN|')){ const[,id,pin]=qr.split('|'); iniciarSesion(id,pin); } }} onClose={() => setMostrarScannerLogin(false)}/>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-32 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div><h1 className="text-2xl font-black italic text-gray-900 leading-none">comidavencida</h1><p className="text-[10px] font-bold text-blue-600 uppercase mt-1">Hogar: {usuarioActual.id}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setMostrarQRCompartir(true)} className="p-2.5 bg-white border border-gray-200 rounded-full text-blue-600"><Share2 size={18}/></button>
          <button onClick={cerrarSesion} className="p-2.5 bg-white border border-gray-200 rounded-full text-gray-400"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2">
        {tabActivo === 'comida' && (
          <div className="space-y-3">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Semáforo de Alimentos</h2>
            {productos.sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)).map(p => {
              const d = calcularDias(p.fecha); const e = obtenerEstado(d);
              return (
                <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between ${e.bg} ${e.border}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px]">{e.icono}</span><span className={`text-[9px] font-black uppercase ${e.text}`}>{e.titulo}</span></div>
                    <h3 className="font-black text-[16px] text-gray-900">{p.nombre}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                  </div>
                  <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                    <div className="text-center min-w-[3rem]"><span className={`block text-2xl font-black ${e.text}`}>{Math.abs(d)}</span><span className="text-[8px] font-black opacity-50 uppercase">días</span></div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => abrirEdicion(p, 'alimento')} className="text-gray-400 hover:text-blue-600"><Edit2 size={16}/></button>
                      <button onClick={async() => { await addDoc(collection(db,'despensas',usuarioActual.id,'compras'), {nombre: p.nombre, comprado: false}); }} className="text-gray-400 hover:text-green-600"><ShoppingCart size={16}/></button>
                      <button onClick={() => borrarItem(p.id, 'items')} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tabActivo === 'medicamentos' && (
          <div className="space-y-3">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Botiquín y Alarmas</h2>
            {medicamentos.map(m => {
              const d = calcularDias(m.fecha); const e = obtenerEstado(d);
              return (
                <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 ${e.bg} ${e.border}`}>
                   <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-black text-lg text-gray-900">{m.nombre}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Vencimiento: {m.fecha.split('-').reverse().join('/')}</p>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => abrirEdicion(m, 'medicamento')} className="text-gray-400"><Edit2 size={16}/></button>
                        <button onClick={() => borrarItem(m.id, 'medicamentos')} className="text-gray-400"><Trash2 size={16}/></button>
                      </div>
                   </div>
                   <div className="bg-white/50 p-4 rounded-xl border border-white flex items-center gap-3">
                      <Clock size={20} className="text-blue-600"/>
                      <div>
                        <p className="text-xs font-black text-gray-800">Cada {m.frecuencia}h | Inicio: {m.horaInicio}</p>
                        <p className="text-[10px] font-bold text-blue-500 uppercase">{m.esSiempre ? 'Tratamiento Continuo' : `Por ${m.duracion} días`}</p>
                      </div>
                   </div>
                </div>
              );
            })}
          </div>
        )}

        {tabActivo === 'compras' && (
          <div className="space-y-3">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Lista de Compras</h2>
            {compras.map(c => (
              <div key={c.id} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                <div onClick={() => toggleCompra(c)} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-200'}`}>{c.comprado && <CheckCircle2 size={14} className="text-white"/>}</div>
                  <span className={`font-bold ${c.comprado ? 'line-through text-gray-300' : 'text-gray-700'}`}>{c.nombre}</span>
                </div>
                <button onClick={() => borrarItem(c.id, 'compras')} className="text-gray-300 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
        <div className="max-w-md mx-auto flex justify-around">
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}`}><Leaf size={24}/><span className="text-[10px] font-bold uppercase mt-1">Despensa</span></button>
          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center ${tabActivo === 'medicamentos' ? 'text-blue-600' : 'text-gray-400'}`}><Pill size={24}/><span className="text-[10px] font-bold uppercase mt-1">Botiquín</span></button>
          <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center ${tabActivo === 'compras' ? 'text-blue-600' : 'text-gray-400'}`}><ShoppingCart size={24}/><span className="text-[10px] font-bold uppercase mt-1">Compras</span></button>
        </div>
      </nav>

      <div className="fixed bottom-24 right-6 flex flex-col gap-3">
        <button onClick={() => { setEditandoId(null); setNuevoItem({ tipo: tabActivo === 'comida' ? 'alimento' : 'medicamento', nombre: '', codigo: '', fecha: '', dosis: '', frecuencia: 8, horaInicio: '08:00', duracion: '7', esSiempre: false }); setMostrarForm(true); }} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center"><Plus size={24}/></button>
        <button onClick={() => setMostrarScanner(true)} className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl flex items-center justify-center"><ScanBarcode size={24}/></button>
      </div>

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative animate-in slide-in-from-bottom">
            <h2 className="text-2xl font-black mb-6 italic">{editandoId ? 'Editar' : 'Agregar'}</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoItem.nombre} onChange={e => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl font-bold uppercase" value={nuevoItem.fecha} onChange={e => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
              
              {nuevoItem.tipo === 'medicamento' && (
                <div className="p-4 bg-blue-50 rounded-2xl space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase text-blue-400 ml-2">¿Cada cuánto (hrs)?</label>
                      <input type="number" className="w-full p-3 bg-white rounded-xl font-bold" value={nuevoItem.frecuencia} onChange={e => setNuevoItem({...nuevoItem, frecuencia: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase text-blue-400 ml-2">Hora 1ª Toma</label>
                      <input type="time" className="w-full p-3 bg-white rounded-xl font-bold" value={nuevoItem.horaInicio} onChange={e => setNuevoItem({...nuevoItem, horaInicio: e.target.value})} />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black uppercase text-blue-400 ml-2">¿Por cuántos días?</label>
                      <input type="number" disabled={nuevoItem.esSiempre} className="w-full p-3 bg-white rounded-xl font-bold disabled:opacity-30" value={nuevoItem.duracion} onChange={e => setNuevoItem({...nuevoItem, duracion: e.target.value})} />
                    </div>
                    <label className="flex items-center gap-2 font-bold text-xs text-blue-600 mt-4 cursor-pointer">
                      <input type="checkbox" checked={nuevoItem.esSiempre} onChange={e => setNuevoItem({...nuevoItem, esSiempre: e.target.checked})} /> Siempre
                    </label>
                  </div>
                </div>
              )}

              <button onClick={agregarOEditarItem} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase tracking-widest">{editandoId ? 'Guardar Cambios' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && <Scanner onScan={(c)=>{ setNuevoItem({...nuevoItem, codigo:c}); setMostrarScanner(false); setMostrarForm(true); }} onClose={()=>setMostrarScanner(false)}/>}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60" onClick={() => setMostrarQRCompartir(false)}>
          <div className="bg-white p-8 rounded-[2.5rem] text-center max-w-sm w-full">
            <h2 className="text-xl font-black mb-4 italic">Invitar a la familia</h2>
            <img src={qrUrl} alt="QR" className="mx-auto mb-4 w-44 h-44" />
            <p className="font-black text-blue-600 text-lg uppercase">{usuarioActual.id}</p>
            <p className="text-xs font-bold text-gray-400 tracking-widest">PIN: {usuarioActual.pin}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;