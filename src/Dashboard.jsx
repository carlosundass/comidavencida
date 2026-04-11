import React, { useState, useEffect } from 'react';
import { Trash2, X, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2, Edit2, ShoppingCart, CheckCircle2, BellRing, Bell, Search, BookOpen, ThumbsUp, AlertTriangle, Menu, Infinity, Globe, FileText, Gift } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// INYECCIÓN DE CSS PARA LA ANIMACIÓN DEL REGALO
// ==========================================
const estilocss = `
  @keyframes qnvGradientPulse {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .qnv-gift-card {
    position: relative;
    background: white;
    border-radius: 2rem;
    padding: 1px;
    overflow: hidden;
    transition: all 0.3s ease;
  }
  .qnv-gift-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(115deg, #2563eb, #3b82f6, #60a5fa, #4f46e5);
    background-size: 300% 300%;
    animation: qnvGradientPulse 3s infinite linear;
    opacity: 0.7;
    z-index: 0;
  }
  .qnv-gift-content {
    position: relative;
    z-index: 10;
    background: white;
    border-radius: 1.9rem;
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: background-color 0.3s;
  }
  .qnv-gift-card:hover .qnv-gift-content {
    background: #f0f7ff;
  }
`;

const Dashboard = () => {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = estilocss;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  // ==========================================
  // ESTADOS PRINCIPALES
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
  const [tabActivo, setTabActivo] = useState('comida');
  const [busqueda, setBusqueda] = useState('');

  // ESTADOS DE UI Y MODALES
  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState('Notification' in window ? Notification.permission : 'denied');
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);

  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [itemABorrar, setItemABorrar] = useState(null); 
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [alarmasEnviadas, setAlarmasEnviadas] = useState(new Set());
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: '8', horaInicio: '08:00'
  });

  // ==========================================
  // LÓGICA DE FIREBASE Y SESIÓN
  // ==========================================
  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), s => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompras = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), s => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubCompras(); };
    }
  }, [usuarioActual]);

  const manejarAcceso = async () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    if (idLimpio.length < 3) return setErrorAuth('Mínimo 3 letras.');
    if (inputPin.length !== 4) return setErrorAuth('PIN de 4 números.');
    setCargandoAuth(true);
    try {
      const despensaRef = doc(db, 'despensas', idLimpio);
      const despensaSnap = await getDoc(despensaRef);
      if (modoLogin === 'crear') {
        if (despensaSnap.exists()) { setErrorAuth('Ese hogar ya existe.'); } 
        else { await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!despensaSnap.exists() || despensaSnap.data().pin !== inputPin) { setErrorAuth('Datos incorrectos.'); } 
        else { iniciarSesion(idLimpio, inputPin); }
      }
    } catch (e) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const data = { id, pin };
    setUsuarioActual(data);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(data));
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
  };

  // ==========================================
  // LÓGICA DE SUGERENCIAS
  // ==========================================
  const enviarFeedback = async () => {
    if (!mensajeFeedback.trim()) return;
    setEnviandoFeedback(true);
    try {
      await fetch("https://formsubmit.co/ajax/hola@quenosevenza.cl", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          Hogar: usuarioActual.id,
          Mensaje: mensajeFeedback,
          _subject: "💡 Sugerencia App: " + usuarioActual.id
        })
      });
      alert("¡Enviado! Gracias por tu ayuda.");
      setMensajeFeedback('');
      setMostrarFeedback(false);
    } catch (e) { alert("Error al enviar."); } finally { setEnviandoFeedback(false); }
  };

  // ==========================================
  // LÓGICA DE PRODUCTOS
  // ==========================================
  const calcularDias = (f) => { if (!f) return 999; return Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24)); };
  
  const obtenerEstado = (item) => {
    if (item.sinFecha) return { titulo: 'INSUMO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', icono: '📦' };
    const dias = calcularDias(item.fecha);
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const col = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const datos = { nombre: nuevoItem.nombre, fecha: nuevoItem.sinFecha ? '' : nuevoItem.fecha, sinFecha: nuevoItem.sinFecha, actualizadoEn: new Date().getTime() };
    if (nuevoItem.tipo === 'medicamento') { datos.dosis = nuevoItem.dosis; datos.frecuencia = nuevoItem.frecuencia; datos.horaInicio = nuevoItem.horaInicio; }
    
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, col, editandoId), datos);
    else { datos.creadoEn = new Date().getTime(); await addDoc(collection(db, 'despensas', usuarioActual.id, col), datos); }
    setMostrarForm(false);
    setEditandoId(null);
  };

  const confirmarBorradoEstadistica = async (estado) => {
    if (!itemABorrar) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { nombre: itemABorrar.nombre, tipo: itemABorrar.tipo, resultado: estado, fecha: new Date().getTime() });
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, itemABorrar.coleccion, itemABorrar.id));
    setItemABorrar(null);
  };

  const toggleCompra = async (item) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado }); };
  const borrarItemDirecto = async (id, col) => { await deleteDoc(doc(db, 'despensas', usuarioActual.id, col, id)); };

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const medicamentosFiltrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // ==========================================
  // RENDER LOGIN
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <h1 className="text-4xl font-black italic text-center mb-10 tracking-tighter">quenosevenza</h1>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Crear</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Entrar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Hogar" className="w-full p-4 bg-gray-50 rounded-2xl font-bold outline-none" value={inputId} onChange={(e) => setInputId(e.target.value)} />
              <input type="password" placeholder="PIN" className="w-full p-4 bg-gray-50 rounded-2xl text-center font-black text-2xl outline-none" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
              {errorAuth && <div className="text-red-600 text-xs font-bold text-center">{errorAuth}</div>}
              <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase active:scale-95 transition-transform">Ir 🚀</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER DASHBOARD
  // ==========================================
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QNV-LOGIN|${usuarioActual.id}|${usuarioActual.pin}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black italic tracking-tight leading-none">quenosevenza</h1>
          <p className="font-bold text-[10px] uppercase text-blue-600 tracking-widest">{usuarioActual.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarFeedback(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-amber-500 shadow-sm"><BookOpen size={18} /></button>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-indigo-600 shadow-sm"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 shadow-sm"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        {/* BUSCADOR */}
        {(tabActivo === 'comida' || tabActivo === 'medicamentos') && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-6">
             <Search size={18} className="text-gray-400 ml-1" />
             <input type="text" placeholder={`Buscar en ${tabActivo}...`} value={busqueda} onChange={e => setBusqueda(e.target.value)} className="flex-1 outline-none text-sm font-bold bg-transparent" />
          </div>
        )}

        {/* BANNER REGALO (Misma pestaña) */}
        {tabActivo === 'comida' && !busqueda && (
          <div className="mb-8 animate-in zoom-in-95">
            <a href="https://quenosevenza.cl/regalo/" className="qnv-gift-card block shadow-lg">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-sm"><Gift size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1 tracking-widest">Regalo de Abril</p>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">Guía Pro: Limpieza de Refrigerador</h3>
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRight size={16} /></div>
              </div>
            </a>
          </div>
        )}

        {/* LISTADO COMIDA */}
        {tabActivo === 'comida' && (
          <div className="space-y-3">
            {productosFiltrados.sort((a,b) => (a.sinFecha?1:-1) || new Date(a.fecha)-new Date(b.fecha)).map((p) => {
              const est = obtenerEstado(p);
              const dias = p.sinFecha ? null : calcularDias(p.fecha);
              return (
                <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm ${est.bg} ${est.border}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px]">{est.icono}</span><span className={`text-[9px] font-black uppercase ${est.text}`}>{est.titulo}</span></div>
                    <h3 className="font-black text-[16px] text-gray-900 leading-tight">{p.nombre}</h3>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{p.sinFecha ? 'Permanente' : `Vence: ${p.fecha}`}</p>
                  </div>
                  <div className="flex items-center gap-1 pl-3 border-l border-black/10">
                    <div className="text-center min-w-[3rem]">
                      {p.sinFecha ? <Infinity size={20} className="mx-auto text-gray-400" /> : <span className={`text-2xl font-black ${est.text}`}>{Math.abs(dias)}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => { setEditandoId(p.id); setNuevoItem({...p, tipo: 'alimento'}); setMostrarForm(true); }} className="p-1.5 bg-white rounded-full shadow-sm text-gray-400"><Edit2 size={12} /></button>
                      <button onClick={() => setItemABorrar({id: p.id, nombre: p.nombre, coleccion: 'items', tipo: 'alimento'})} className="p-1.5 bg-white rounded-full shadow-sm text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTADO MEDICAMENTOS */}
        {tabActivo === 'medicamentos' && (
          <div className="space-y-3">
            {medicamentosFiltrados.map((m) => {
              const est = obtenerEstado(m);
              return (
                <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 flex flex-col ${est.bg} ${est.border}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-[16px] text-gray-900">{m.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase">Dosis: {m.dosis} | Cada {m.frecuencia}h</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditandoId(m.id); setNuevoItem({...m, tipo: 'medicamento'}); setMostrarForm(true); }} className="p-1.5 bg-white rounded-full shadow-sm text-gray-400"><Edit2 size={12} /></button>
                      <button onClick={() => setItemABorrar({id: m.id, nombre: m.nombre, coleccion: 'medicamentos', tipo: 'medicamento'})} className="p-1.5 bg-white rounded-full shadow-sm text-red-500"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA DE COMPRAS */}
        {tabActivo === 'compras' && (
          <div className="space-y-2">
            <input type="text" placeholder="Añadir a la lista..." className="w-full p-4 bg-white border rounded-2xl font-bold mb-4" onKeyDown={async (e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                await addDoc(collection(db, 'despensas', usuarioActual.id, 'compras'), { nombre: e.target.value.trim(), comprado: false, creadoEn: new Date().getTime() });
                e.target.value = '';
              }
            }} />
            {compras.map(c => (
              <div key={c.id} className="p-4 bg-white rounded-2xl border flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleCompra(c)}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{c.comprado && <CheckCircle2 size={14} className="text-white"/>}</div>
                  <span className={`font-black text-sm ${c.comprado ? 'line-through text-gray-400' : 'text-gray-800'}`}>{c.nombre}</span>
                </div>
                <button onClick={() => borrarItemDirecto(c.id, 'compras')} className="text-gray-400"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL DE SUGERENCIAS */}
      {mostrarFeedback && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-2xl font-black italic text-gray-900 mb-2">¿Cómo mejorar? 💡</h3>
            <textarea 
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-sm h-32 resize-none"
              placeholder="Cuéntanos tu sugerencia..."
              value={mensajeFeedback}
              onChange={(e) => setMensajeFeedback(e.target.value)}
            />
            <button onClick={enviarFeedback} disabled={enviandoFeedback || !mensajeFeedback.trim()} className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl mt-4 disabled:opacity-50">
              {enviandoFeedback ? 'Enviando...' : 'Enviar Sugerencia'}
            </button>
            <button onClick={() => setMostrarFeedback(false)} className="w-full text-gray-400 font-bold text-[10px] uppercase mt-2">Cerrar</button>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-4 z-40">
        <button onClick={() => setTabActivo('comida')} className={tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}><Leaf size={24} /></button>
        <button onClick={() => setTabActivo('medicamentos')} className={tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}><Pill size={24} /></button>
        <button onClick={() => setTabActivo('compras')} className={tabActivo === 'compras' ? 'text-green-600' : 'text-gray-400'}><ShoppingCart size={24} /></button>
      </nav>

      {/* BOTÓN FLOTANTE (+) */}
      <div className="fixed bottom-[100px] right-6 z-30">
        <button onClick={() => abrirFormulario()} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Plus size={24} /></button>
      </div>

      {/* MODAL FORMULARIO AÑADIR/EDITAR */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">{editandoId ? 'Editar' : 'Añadir'}</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            {!editandoId && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'alimento'})} className={`flex-1 py-2 font-black rounded-lg ${nuevoItem.tipo === 'alimento' ? 'bg-white text-blue-600' : 'text-gray-400'}`}>Comida</button>
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'medicamento'})} className={`flex-1 py-2 font-black rounded-lg ${nuevoItem.tipo === 'medicamento' ? 'bg-white text-indigo-600' : 'text-gray-400'}`}>Botiquín</button>
              </div>
            )}
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              {!nuevoItem.sinFecha && <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl font-bold uppercase" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />}
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                 <input type="checkbox" id="noV" checked={nuevoItem.sinFecha} onChange={(e) => setNuevoItem({...nuevoItem, sinFecha: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                 <label htmlFor="noV" className="text-sm font-bold text-gray-700">Sin vencimiento</label>
              </div>
              <button onClick={agregarOEditarItem} className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl uppercase shadow-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE BORRADO (Papelera Inteligente) */}
      {itemABorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black italic mb-4 tracking-tighter">¿Qué pasó con esto?</h3>
            <div className="bg-gray-50 p-4 rounded-2xl mb-6 font-black text-lg text-gray-800">{itemABorrar.nombre}</div>
            <div className="flex flex-col gap-3">
              <button onClick={() => confirmarBorradoEstadistica('consumido')} className="w-full bg-green-100 text-green-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 active:scale-95 border border-green-200"><ThumbsUp size={20}/> Consumido</button>
              <button onClick={() => confirmarBorradoEstadistica('basura')} className="w-full bg-red-100 text-red-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 active:scale-95 border border-red-200"><AlertTriangle size={20}/> A la basura</button>
              <button onClick={() => setItemABorrar(null)} className="text-gray-400 font-bold text-[10px] uppercase p-2 tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QR COMPARTIR */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative text-center">
            <button onClick={() => setMostrarQRCompartir(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            <h2 className="text-2xl font-black italic mb-2">Invitar Familiar</h2>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-50 mb-4 flex justify-center">
              <img src={qrUrl} alt="QR Familiar" className="w-[180px] h-[180px]" />
            </div>
            <p className="text-blue-600 font-black text-xl uppercase tracking-widest">{usuarioActual.id}</p>
            <p className="text-gray-400 font-black tracking-[0.5em] text-xs mt-1">PIN: {usuarioActual.pin}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;