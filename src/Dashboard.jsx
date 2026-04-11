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
  // ESTADOS PRINCIPALES Y AUTENTICACIÓN
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

  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState('Notification' in window ? Notification.permission : 'denied');
  
  // ESTADOS FEEDBACK (OPCIÓN B)
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
  // LÓGICA DE FIREBASE Y REAL-TIME
  // ==========================================
  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), s => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompras = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), s => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubCompras(); };
    }
  }, [usuarioActual]);

  // ==========================================
  // LÓGICA DE ALARMAS DE MEDICAMENTOS (EL MOTOR)
  // ==========================================
  useEffect(() => {
    if (!usuarioActual || medicamentos.length === 0) return;
    const revisarAlarmas = () => {
      const ahora = new Date().getTime();
      medicamentos.forEach(m => {
        if (!m.frecuencia || m.frecuencia === 'Sin Alarma') return;
        const horasFrec = parseInt(m.frecuencia);
        if (isNaN(horasFrec)) return;
        let msProximaToma = 0;
        if (m.ultimaToma) msProximaToma = m.ultimaToma + (horasFrec * 60 * 60 * 1000);
        else if (m.horaInicio) {
          const [h, min] = m.horaInicio.split(':');
          const d = new Date(); d.setHours(parseInt(h), parseInt(min), 0, 0); msProximaToma = d.getTime();
        }
        if (msProximaToma > 0 && ahora >= msProximaToma && (ahora - msProximaToma < 60000)) {
          const idNotif = `${m.id}-${msProximaToma}`;
          if (!alarmasEnviadas.has(idNotif)) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('¡Hora de tu medicina!', { body: `Toca: ${m.nombre}`, icon: 'https://cdn-icons-png.flaticon.com/512/883/883407.png' });
            }
            setAlarmasEnviadas(prev => new Set(prev).add(idNotif));
          }
        }
      });
    };
    const int = setInterval(revisarAlarmas, 10000);
    return () => clearInterval(int);
  }, [usuarioActual, medicamentos, alarmasEnviadas]);

  const registrarToma = async (id) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'medicamentos', id), { ultimaToma: new Date().getTime() }); };

  // ==========================================
  // MANEJO DE ACCESO Y QR
  // ==========================================
  const manejarAcceso = async () => {
    setErrorAuth('');
    const idLimpio = inputId.trim().toLowerCase();
    if (idLimpio.length < 3) return setErrorAuth('Mínimo 3 letras.');
    if (inputPin.length !== 4) return setErrorAuth('PIN de 4 números.');
    setCargandoAuth(true);
    try {
      const dRef = doc(db, 'despensas', idLimpio);
      const dSnap = await getDoc(dRef);
      if (modoLogin === 'crear') {
        if (dSnap.exists()) setErrorAuth('El nombre ya existe.');
        else { await setDoc(dRef, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!dSnap.exists() || dSnap.data().pin !== inputPin) setErrorAuth('Datos incorrectos.');
        else iniciarSesion(idLimpio, inputPin);
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

  const procesarQRLogin = async (codigo) => {
    setMostrarScannerLogin(false);
    if (codigo.startsWith('QNV-LOGIN|')) {
      const [, qrId, qrPin] = codigo.split('|');
      iniciarSesion(qrId, qrPin);
    } else {
      alert("QR No válido.");
    }
  };

  // ==========================================
  // LÓGICA DE SUGERENCIAS (OPCIÓN B)
  // ==========================================
  const enviarFeedback = async () => {
    if (!mensajeFeedback.trim()) return;
    setEnviandoFeedback(true);
    try {
      await fetch("https://formsubmit.co/ajax/hola@quenosevenza.cl", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ Hogar: usuarioActual.id, Mensaje: mensajeFeedback, _subject: "💡 Sugerencia: " + usuarioActual.id })
      });
      alert("¡Gracias! Recibimos tu idea.");
      setMensajeFeedback(''); setMostrarFeedback(false);
    } catch (e) { alert("Error al enviar."); } finally { setEnviandoFeedback(false); }
  };

  // ==========================================
  // FUNCIONES DE PRODUCTOS Y UI
  // ==========================================
  const abrirFormulario = (item = null, tipo = 'alimento') => {
    if (item) {
      setEditandoId(item.id);
      setNuevoItem({ ...item, tipo });
    } else {
      setEditandoId(null);
      setNuevoItem({ tipo, nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: '8', horaInicio: '08:00' });
    }
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const col = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const datos = { ...nuevoItem, actualizadoEn: new Date().getTime() };
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, col, editandoId), datos);
    else { datos.creadoEn = new Date().getTime(); await addDoc(collection(db, 'despensas', usuarioActual.id, col), datos); }
    setMostrarForm(false);
  };

  const confirmarBorradoEstadistica = async (estado) => {
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { ...itemABorrar, resultado: estado, fecha: new Date().getTime() });
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, itemABorrar.coleccion, itemABorrar.id));
    setItemABorrar(null);
  };

  const calcularDias = (f) => { if (!f) return 999; return Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24)); };
  
  const obtenerEstado = (item) => {
    if (item.sinFecha) return { titulo: 'INSUMO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', icono: '📦' };
    const dias = calcularDias(item.fecha);
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const medicamentosFiltrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // ==========================================
  // RENDER PANTALLA LOGIN
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative font-sans">
        <div className="absolute top-0 left-0 w-full p-6 flex justify-start z-10">
          <a href="https://quenosevenza.cl" className="text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-blue-600 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            ← Volver a la Webb
          </a>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-sm mt-10 animate-in fade-in duration-500">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-black tracking-tighter text-gray-900 italic">quenosevenza</h1>
              <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-2">Acceso Seguro</p>
            </div>
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
              <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
                <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear Nuevo</button>
                <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Nombre Hogar" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
                <input type="password" placeholder="PIN 4 Nros" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em]" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
                {errorAuth && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100">{errorAuth}</div>}
                <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-sm active:scale-95 transition-transform">{cargandoAuth ? 'Conectando...' : 'Entrar ✅'}</button>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-100">
                <button onClick={() => setMostrarScannerLogin(true)} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 font-black p-4 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-all"><QrCode size={20} /> Escanear QR</button>
              </div>
            </div>
          </div>
        </div>
        {mostrarScannerLogin && <Scanner onScan={procesarQRLogin} onClose={() => setMostrarScannerLogin(false)} />}
      </div>
    );
  }

  // --- DASHBOARD RENDER ---
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QNV-LOGIN|${usuarioActual.id}|${usuarioActual.pin}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none italic">quenosevenza</h1>
          <p className="font-bold text-[10px] uppercase text-blue-600 tracking-widest mt-1">{usuarioActual.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTÓN SUGERENCIAS */}
          <button onClick={() => setMostrarFeedback(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-amber-500 shadow-sm transition-transform active:scale-90"><BookOpen size={18} /></button>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-indigo-600 shadow-sm"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 shadow-sm"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        {/* BUSCADOR */}
        {(tabActivo === 'comida' || tabActivo === 'medicamentos') && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-6 animate-in slide-in-from-top-4">
             <Search size={18} className="text-gray-400 ml-1" />
             <input type="text" placeholder={`Buscar...`} value={busqueda} onChange={e => setBusqueda(e.target.value)} className="flex-1 outline-none text-sm font-bold text-gray-700 bg-transparent" />
          </div>
        )}

        {/* REGALO DE ABRIL (Misma pestaña) */}
        {tabActivo === 'comida' && !busqueda && (
          <div className="mb-8 animate-in zoom-in-95 duration-500">
            <a href="https://quenosevenza.cl/regalo/" className="qnv-gift-card block shadow-lg">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-sm flex items-center justify-center"><Gift size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Regalo de Abril</p>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">Guía Pro: Limpieza de Refrigerador</h3>
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 flex items-center justify-center"><ArrowRight size={16} /></div>
              </div>
            </a>
          </div>
        )}

        {/* LISTADO COMIDA */}
        {tabActivo === 'comida' && (
          <div className="animate-in fade-in duration-300 space-y-3">
            {productosFiltrados
              .sort((a, b) => (a.sinFecha ? 1 : -1) || new Date(a.fecha) - new Date(b.fecha))
              .map((p) => {
              const est = obtenerEstado(p);
              const dias = p.sinFecha ? null : calcularDias(p.fecha);
              return (
                <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm transition-all ${est.bg} ${est.border}`}>
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px]">{est.icono}</span><span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span></div>
                    <h3 className="font-black text-[16px] leading-tight text-gray-900">{p.nombre}</h3>
                    <p className="text-[10px] font-bold text-gray-500 mt-1">{p.sinFecha ? 'Permanente' : `Vence: ${p.fecha}`}</p>
                  </div>
                  <div className="flex items-center gap-1 pl-3 border-l border-black/10">
                    <div className="text-center min-w-[3rem]">
                      {p.sinFecha ? <Infinity size={24} className="text-gray-400 mx-auto" /> : <span className={`text-2xl font-black ${est.text}`}>{Math.abs(dias)}</span>}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button onClick={() => abrirFormulario(p, 'alimento')} className="text-gray-400 p-1.5 bg-white rounded-full shadow-sm"><Edit2 size={12} /></button>
                      <button onClick={() => setItemABorrar({ id: p.id, nombre: p.nombre, coleccion: 'items', tipo: 'alimento' })} className="text-red-400 p-1.5 bg-white rounded-full shadow-sm"><Trash2 size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LISTADO MEDICAMENTOS */}
        {tabActivo === 'medicamentos' && (
          <div className="animate-in fade-in duration-300 space-y-3">
            {medicamentosFiltrados.map((m) => {
              const est = obtenerEstado(m);
              return (
                <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 flex flex-col shadow-sm ${est.bg} ${est.border}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-[16px] text-gray-900 leading-tight">{m.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Dosis: {m.dosis} | Cada {m.frecuencia}h</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirFormulario(m, 'medicamento')} className="text-gray-400 p-2 bg-white rounded-full shadow-sm"><Edit2 size={14} /></button>
                      <button onClick={() => setItemABorrar({ id: m.id, nombre: m.nombre, coleccion: 'medicamentos', tipo: 'medicamento' })} className="text-red-400 p-2 bg-white rounded-full shadow-sm"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {m.frecuencia !== 'Sin Alarma' && (
                    <button onClick={() => registrarToma(m.id)} className="w-full bg-white/60 p-3 rounded-xl border border-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      <Clock size={14} /> Registrar Toma
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* LISTA COMPRAS */}
        {tabActivo === 'compras' && (
          <div className="animate-in fade-in duration-300 space-y-2">
            <input type="text" placeholder="Añadir a la lista..." className="w-full p-4 bg-white shadow-sm border border-gray-100 rounded-2xl outline-none font-bold text-gray-800 text-sm mb-4" onKeyDown={async (e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                await addDoc(collection(db, 'despensas', usuarioActual.id, 'compras'), { nombre: e.target.value.trim(), comprado: false, creadoEn: new Date().getTime() });
                e.target.value = '';
              }
            }} />
            {compras.map(c => (
              <div key={c.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${c.comprado ? 'bg-gray-50 opacity-60' : 'bg-white shadow-sm border-gray-200'}`}>
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleCompra(c)}>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{c.comprado && <CheckCircle2 size={14} className="text-white"/>}</div>
                  <span className={`font-black text-sm ${c.comprado ? 'line-through text-gray-400' : 'text-gray-800'}`}>{c.nombre}</span>
                </div>
                <button onClick={() => deleteDoc(doc(db, 'despensas', usuarioActual.id, 'compras', c.id))} className="text-gray-400 p-2"><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* MODAL FEEDBACK */}
      {mostrarFeedback && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black italic text-gray-900 mb-2">¿Cómo mejorar? 💡</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tu idea puede ser la próxima función.</p>
            <textarea className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-sm h-32 resize-none" placeholder="Cuéntanos tu sugerencia..." value={mensajeFeedback} onChange={(e) => setMensajeFeedback(e.target.value)} />
            <div className="flex flex-col gap-3 mt-6">
              <button onClick={enviarFeedback} disabled={enviandoFeedback || !mensajeFeedback.trim()} className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl active:scale-95 disabled:opacity-50 transition-all">{enviandoFeedback ? 'Enviando...' : 'Enviar Sugerencia'}</button>
              <button onClick={() => setMostrarFeedback(false)} className="text-gray-400 font-bold text-[10px] uppercase p-2 tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-between px-4 py-2">
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Leaf size={22} className={tabActivo === 'comida' ? 'fill-blue-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase">Despensa</span>
          </button>
          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <Pill size={22} className={tabActivo === 'medicamentos' ? 'fill-indigo-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase">Botiquín</span>
          </button>
          <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center p-2 flex-1 ${tabActivo === 'compras' ? 'text-green-600' : 'text-gray-400'}`}>
            <ShoppingCart size={22} className={tabActivo === 'compras' ? 'fill-green-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase">Compras</span>
          </button>
        </div>
      </nav>

      {/* BOTÓN FLOTANTE (+) */}
      <div className="fixed bottom-[100px] right-6 z-30">
        <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"><Plus size={24} strokeWidth={3} /></button>
      </div>

      {/* MODAL FORMULARIO AÑADIR/EDITAR (EL OTRO MOTOR) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">{editandoId ? 'Editar' : 'Añadir'}</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
            </div>
            {!editandoId && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'alimento'})} className={`flex-1 py-2 font-black rounded-lg ${nuevoItem.tipo === 'alimento' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Comida</button>
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'medicamento'})} className={`flex-1 py-2 font-black rounded-lg ${nuevoItem.tipo === 'medicamento' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Botiquín</button>
              </div>
            )}
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              {!nuevoItem.sinFecha && (
                <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl font-bold uppercase" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
              )}
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl border-2 border-transparent">
                 <input type="checkbox" id="noVence" checked={nuevoItem.sinFecha} onChange={(e) => setNuevoItem({...nuevoItem, sinFecha: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                 <label htmlFor="noVence" className="text-sm font-bold text-gray-700 cursor-pointer">Sin vencimiento</label>
              </div>
              {nuevoItem.tipo === 'medicamento' && (
                <div className="flex gap-4">
                  <div className="flex-1"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2 block">Cada (h)</label><select className="w-full p-3 bg-white rounded-xl font-bold" value={nuevoItem.frecuencia} onChange={(e) => setNuevoItem({...nuevoItem, frecuencia: e.target.value})}><option value="4">4h</option><option value="8">8h</option><option value="12">12h</option><option value="24">24h</option></select></div>
                  <div className="flex-1"><label className="text-[10px] font-black text-indigo-400 uppercase ml-2 block">Inicio</label><input type="time" className="w-full p-3 bg-white rounded-xl font-bold" value={nuevoItem.horaInicio} onChange={(e) => setNuevoItem({...nuevoItem, horaInicio: e.target.value})} /></div>
                </div>
              )}
              <button onClick={agregarOEditarItem} className={`w-full text-white font-black p-5 rounded-2xl shadow-xl active:scale-95 transition-all ${nuevoItem.tipo === 'alimento' ? 'bg-gray-900' : 'bg-indigo-600'}`}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* PAPELERA INTELIGENTE */}
      {itemABorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black italic text-gray-900 mb-2">¿Qué pasó con esto?</h3>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 font-black text-lg text-gray-800">{itemABorrar.nombre}</div>
            <div className="flex flex-col gap-3">
              <button onClick={() => confirmarBorradoEstadistica('consumido')} className="w-full bg-green-100 text-green-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 border border-green-200"><ThumbsUp size={20}/> Consumido</button>
              <button onClick={() => confirmarBorradoEstadistica('basura')} className="w-full bg-red-100 text-red-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 border border-red-200"><AlertTriangle size={20}/> A la basura</button>
              <button onClick={() => setItemABorrar(null)} className="mt-4 text-gray-400 font-bold text-xs uppercase tracking-widest p-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPARTIR */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarQRCompartir(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative text-center">
            <button onClick={() => setMostrarQRCompartir(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500"><X size={18}/></button>
            <h2 className="text-2xl font-black text-gray-900 italic mb-2">Invitar Familiar</h2>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-50 mb-4 flex justify-center"><img src={qrUrl} alt="QR Familiar" className="w-[180px] h-[180px]" /></div>
            <p className="text-blue-600 font-black text-xl uppercase tracking-widest">{usuarioActual.id}</p>
            <p className="text-gray-400 font-black tracking-[0.5em] text-xs mt-1">PIN: {usuarioActual.pin}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;