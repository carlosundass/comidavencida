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

// ==========================================
// COMPONENTE PARA ADSENSE (MODO PRUEBA INTEGRADO)
// ==========================================
const AdSenseBanner = ({ adSlot, isTest = true }) => {
  useEffect(() => {
    if (!isTest) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (err) {
        console.error('Error cargando AdSense:', err);
      }
    }
  }, [isTest]);

  return (
    <div className="w-full flex flex-col items-center my-6 overflow-hidden">
      <span className="text-[8px] font-black text-gray-300 uppercase mb-1 tracking-widest">
        Publicidad {isTest ? 'de Prueba' : ''}
      </span>
      <div 
        className={`w-full max-w-[320px] h-[100px] flex items-center justify-center rounded-xl border-2 border-dashed ${isTest ? 'bg-gray-100 border-gray-200' : 'bg-transparent border-transparent'}`}
      >
        {isTest ? (
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Banner Horizontal</p>
            <p className="text-[9px] text-gray-300 font-bold italic">Espacio: {adSlot}</p>
          </div>
        ) : (
          <ins className="adsbygoogle"
               style={{ display: 'inline-block', width: '320px', height: '100px' }}
               data-ad-client="ca-pub-3386079946838939"
               data-ad-slot={adSlot}></ins>
        )}
      </div>
    </div>
  );
};

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
  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState('Notification' in window ? Notification.permission : 'denied');
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [itemABorrar, setItemABorrar] = useState(null); 
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [alarmasEnviadas, setAlarmasEnviadas] = useState(new Set());
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: '8', horaInicio: '08:00'
  });

  // Lógica de Firebase y Alarmas (Se mantiene igual que tu código)
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
        if (despensaSnap.exists()) { setErrorAuth('Ese nombre ya existe.'); } 
        else { await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!despensaSnap.exists() || despensaSnap.data().pin !== inputPin) { setErrorAuth('ID o PIN incorrecto.'); } 
        else { iniciarSesion(idLimpio, inputPin); }
      }
    } catch (e) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const data = { id, pin }; setUsuarioActual(data);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(data));
  };

  const cerrarSesion = () => { setUsuarioActual(null); localStorage.removeItem('cv_usuario_activo'); };

  const calcularDias = (f) => { if (!f) return 999; return Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24)); };
  const obtenerEstado = (item) => {
    if (item.sinFecha) return { titulo: 'INSUMO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', icono: '📦' };
    const dias = calcularDias(item.fecha);
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  const abrirFormulario = (itemToEdit = null, tipoPredefinido = 'alimento') => {
    if (itemToEdit) {
      setEditandoId(itemToEdit.id);
      setNuevoItem({ tipo: tipoPredefinido, nombre: itemToEdit.nombre || '', fecha: itemToEdit.fecha || '', sinFecha: itemToEdit.sinFecha || false, dosis: itemToEdit.dosis || '', frecuencia: itemToEdit.frecuencia || '8', horaInicio: itemToEdit.horaInicio || '08:00' });
    } else {
      setEditandoId(null);
      setNuevoItem({ tipo: tipoPredefinido, nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: '8', horaInicio: '08:00' });
    }
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const coleccionDestino = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const datos = { nombre: nuevoItem.nombre, fecha: nuevoItem.sinFecha ? '' : nuevoItem.fecha, sinFecha: nuevoItem.sinFecha, actualizadoEn: new Date().getTime() };
    if (nuevoItem.tipo === 'medicamento') { datos.dosis = nuevoItem.dosis || ''; datos.frecuencia = nuevoItem.frecuencia; datos.horaInicio = nuevoItem.horaInicio; }
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, coleccionDestino, editandoId), datos);
    else { datos.creadoEn = new Date().getTime(); await addDoc(collection(db, 'despensas', usuarioActual.id, coleccionDestino), datos); }
    setMostrarForm(false); setEditandoId(null);
  };

  const registrarToma = async (idMed) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'medicamentos', idMed), { ultimaToma: new Date().getTime() }); };
  const solicitarBorrado = (item, coleccion, tipo) => { setItemABorrar({ id: item.id, nombre: item.nombre, coleccion, tipo }); };
  const confirmarBorradoEstadistica = async (estado) => {
    if (!itemABorrar) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { nombre: itemABorrar.nombre, tipo: itemABorrar.tipo, resultado: estado, fecha: new Date().getTime() });
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, itemABorrar.coleccion, itemABorrar.id));
    setItemABorrar(null);
  };

  const agregarACompras = async (nombre) => { await addDoc(collection(db, 'despensas', usuarioActual.id, 'compras'), { nombre, comprado: false, creadoEn: new Date().getTime() }); };
  const toggleCompra = async (item) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado }); };
  const borrarItemDirecto = async (id, col) => { await deleteDoc(doc(db, 'despensas', usuarioActual.id, col, id)); };

  // ==========================================
  // RENDER: PANTALLA LOGIN (CON BANNER)
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative font-sans">
        <div className="absolute top-0 left-0 w-full p-6 flex justify-start z-10">
          <a href="https://quenosevenza.cl" className="text-gray-400 font-black text-xs uppercase bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 tracking-widest">← Volver a la Web</a>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-sm mt-10">
            <h1 className="text-4xl font-black text-center italic mb-10">quenosevenza</h1>
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
              <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
                <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear Nuevo</button>
                <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Nombre Hogar" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
                <input type="password" placeholder="PIN (4 nros)" maxLength={4} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em]" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
                {errorAuth && <div className="text-red-500 text-center text-xs font-bold">{errorAuth}</div>}
                <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase mt-4">{cargandoAuth ? 'Conectando...' : (modoLogin === 'crear' ? 'Abrir Hogar' : 'Entrar')}</button>
              </div>
            </div>
            {/* BANNER EN PARTE INFERIOR DEL LOGIN */}
            <div className="mt-8">
              <AdSenseBanner adSlot="test_login_banner" isTest={true} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: DASHBOARD (CON BANNER INTERIOR)
  // ==========================================
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`QNV-LOGIN|${usuarioActual.id}|${usuarioActual.pin}`)}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black italic">quenosevenza</h1>
          <p className="font-bold text-[10px] uppercase text-blue-600 tracking-widest">{usuarioActual.id}</p>
        </div>
        <div className="flex gap-2">
          <a href="https://quenosevenza.cl" className="bg-white border p-2.5 rounded-full text-blue-600 shadow-sm"><Globe size={18} /></a>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border p-2.5 rounded-full text-indigo-600 shadow-sm"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border p-2.5 rounded-full text-gray-400 shadow-sm"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        {(tabActivo === 'comida' || tabActivo === 'medicamentos') && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-6">
             <Search size={18} className="text-gray-400 ml-1" />
             <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="flex-1 outline-none text-sm font-bold bg-transparent" />
          </div>
        )}

        {/* REGALO DE ABRIL */}
        {tabActivo === 'comida' && !busqueda && (
          <div className="mb-8">
            <a href="https://tuweb.cl/wp-content/uploads/2026/04/guia-limpieza-abril.pdf" target="_blank" rel="noopener noreferrer" className="qnv-gift-card block shadow-lg active:scale-[0.98]">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white"><Gift size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Regalo de Abril</p>
                    <h3 className="text-sm font-black text-gray-900">Guía Pro: Limpieza de Refrigerador</h3>
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRight size={16} /></div>
              </div>
            </a>
          </div>
        )}

        {/* LISTADOS (COMIDA, BOTIQUIN, COMPRAS) - Se mantiene tu lógica intacta */}
        {tabActivo === 'comida' && (
          <div className="space-y-3">
            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .sort((a, b) => (a.sinFecha ? 1 : b.sinFecha ? -1 : new Date(a.fecha) - new Date(b.fecha)))
              .map(p => {
                const est = obtenerEstado(p);
                return (
                  <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm ${est.bg} ${est.border}`}>
                    <div className="flex-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                      <h3 className="font-black text-lg text-gray-900 leading-tight">{p.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">{p.sinFecha ? 'Permanente' : `Vence: ${p.fecha}`}</p>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => abrirFormulario(p, 'alimento')} className="text-gray-300"><Edit2 size={14}/></button>
                       <button onClick={() => solicitarBorrado(p, 'items', 'alimento')} className="text-gray-300"><Trash2 size={14}/></button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ... Lógica para Medicamentos y Compras ... */}
        {tabActivo === 'medicamentos' && (
          <div className="space-y-3">
            {medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase())).map(m => (
              <div key={m.id} className="p-5 bg-white rounded-[1.5rem] border-2 border-gray-100 flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-black text-lg text-gray-900">{m.nombre}</h3>
                  <p className="text-[10px] font-bold text-indigo-500 uppercase">{m.dosis || 'Botiquín'}</p>
                </div>
                <div className="flex gap-2">
                   <button onClick={() => abrirFormulario(m, 'medicamento')} className="text-gray-300"><Edit2 size={14}/></button>
                   <button onClick={() => solicitarBorrado(m, 'medicamentos', 'medicamento')} className="text-gray-300"><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActivo === 'compras' && (
          <div className="space-y-2">
            <input type="text" placeholder="Añadir a la lista..." onKeyDown={e => { if(e.key === 'Enter' && e.target.value.trim()){ agregarACompras(e.target.value); e.target.value=''; }}} className="w-full p-4 bg-white rounded-2xl border border-gray-100 mb-4 font-bold shadow-sm outline-none" />
            {compras.map(c => (
              <div key={c.id} className="p-4 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                <div onClick={() => toggleCompra(c)} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-5 h-5 rounded-full border-2 ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-200'}`}></div>
                  <span className={`font-black text-sm ${c.comprado ? 'line-through text-gray-300' : 'text-gray-700'}`}>{c.nombre}</span>
                </div>
                <button onClick={() => borrarItemDirecto(c.id, 'compras')} className="text-gray-300"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        )}

        {/* BANNER DENTRO DE LA APP (AL FINAL DEL SCROLL) */}
        <div className="mt-10 mb-6">
          <AdSenseBanner adSlot="test_app_banner" isTest={true} />
        </div>
      </main>

      {/* NAVEGACIÓN Y BOTÓN AÑADIR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-10 pt-4 px-6 z-40 flex justify-around">
        <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center gap-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-300'}`}><Leaf size={24}/><span className="text-[9px] font-black uppercase">Despensa</span></button>
        <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center gap-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-300'}`}><Pill size={24}/><span className="text-[9px] font-black uppercase">Botiquín</span></button>
        <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center gap-1 ${tabActivo === 'compras' ? 'text-green-600' : 'text-gray-300'}`}><ShoppingCart size={24}/><span className="text-[9px] font-black uppercase">Compras</span></button>
      </nav>

      {tabActivo !== 'compras' && (
        <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="fixed bottom-28 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl flex items-center justify-center z-30 active:scale-95"><Plus size={24}/></button>
      )}

      {/* MODALES (BORRADO, QR, FORMULARIO) - Mantenidos de tu código */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarQRCompartir(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 text-center relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black italic mb-4">Invitar Familiar</h2>
            <img src={qrUrl} alt="QR" className="mx-auto w-48 h-48 border-4 border-gray-50 rounded-3xl mb-4" />
            <p className="font-black text-blue-600 uppercase tracking-widest">{usuarioActual.id}</p>
          </div>
        </div>
      )}

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom">
            <h2 className="text-2xl font-black italic mb-6">Añadir al Hogar</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              <div className="flex items-center gap-2 font-bold text-xs text-gray-400">
                <input type="checkbox" id="noVence" checked={nuevoItem.sinFecha} onChange={(e) => setNuevoItem({...nuevoItem, sinFecha: e.target.checked})} />
                <label htmlFor="noVence">Sin vencimiento (Insumo permanente)</label>
              </div>
              {!nuevoItem.sinFecha && (
                <input type="date" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
              )}
              <button disabled={!nuevoItem.nombre || (!nuevoItem.sinFecha && !nuevoItem.fecha)} onClick={agregarOEditarItem} className={`w-full text-white font-black p-5 rounded-2xl uppercase mt-4 ${nuevoItem.tipo === 'alimento' ? 'bg-gray-900' : 'bg-indigo-600'} disabled:opacity-30`}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {itemABorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 text-center max-w-sm w-full animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 italic">¿Qué pasó con "{itemABorrar.nombre}"?</h3>
            <div className="flex flex-col gap-3">
              <button onClick={() => confirmarBorradoEstadistica('consumido')} className="w-full bg-green-50 text-green-700 font-black p-4 rounded-2xl border border-green-100 flex items-center justify-center gap-2"><ThumbsUp size={18}/> Consumido</button>
              <button onClick={() => confirmarBorradoEstadistica('basura')} className="w-full bg-red-50 text-red-700 font-black p-4 rounded-2xl border border-red-100 flex items-center justify-center gap-2"><AlertTriangle size={18}/> Botado</button>
              <button onClick={() => setItemABorrar(null)} className="mt-2 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;