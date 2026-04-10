import React, { useState, useEffect } from 'react';
import { Trash2, X, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2, Edit2, ShoppingCart, CheckCircle2, BellRing, Bell, Search, BookOpen, ThumbsUp, AlertTriangle, Menu, Infinity, Globe, FileText, Gift } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// INYECCIÓN DE CSS (ANIMACIONES ORIGINALES)
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
// COMPONENTE ADSENSE (LIMPIO Y DISCRETO)
// ==========================================
const AdSenseBanner = ({ adSlot, isTest = true }) => {
  useEffect(() => {
    if (!isTest) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (err) {}
    }
  }, [isTest]);

  return (
    <div className="w-full flex flex-col items-center my-8 overflow-hidden px-2">
      <span className="text-[8px] font-black text-gray-300 uppercase mb-2 tracking-[0.2em]">Publicidad Recomendada</span>
      <div className={`w-full max-w-[320px] h-[100px] flex items-center justify-center rounded-[1.5rem] border-2 border-dashed ${isTest ? 'bg-gray-50 border-gray-200' : 'bg-transparent border-transparent'}`}>
        {isTest ? (
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic">Banner Publicitario</p>
            <p className="text-[8px] text-gray-300 font-bold uppercase tracking-widest">{adSlot}</p>
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
    styleSheet.innerText = estilocss;
    document.head.appendChild(styleSheet);
    return () => { document.head.removeChild(styleSheet); };
  }, []);

  // ESTADOS Y LÓGICA (SE MANTIENE IGUAL)
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
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [itemABorrar, setItemABorrar] = useState(null); 
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoItem, setNuevoItem] = useState({ tipo: 'alimento', nombre: '', fecha: '', sinFecha: false });

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
  const obtenerEstado = (p) => {
    if (p.sinFecha) return { titulo: 'INSUMO', bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', icono: '📦' };
    const d = calcularDias(p.fecha);
    if (d < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-400', icono: '💀' };
    if (d <= 3) return { titulo: '¡URGENTE!', bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-600', icono: '🔴' };
    if (d <= 7) return { titulo: 'PLANIFICA', bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', icono: '🟠' };
    return { titulo: 'TRANQUILO', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-600', icono: '🟢' };
  };

  const abrirFormulario = (item = null, tipo = 'alimento') => {
    if (item) { setEditandoId(item.id); setNuevoItem({ ...item, tipo }); }
    else { setEditandoId(null); setNuevoItem({ tipo, nombre: '', fecha: '', sinFecha: false }); }
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const col = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const data = { nombre: nuevoItem.nombre, fecha: nuevoItem.sinFecha ? '' : nuevoItem.fecha, sinFecha: nuevoItem.sinFecha, actualizadoEn: new Date().getTime() };
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, col, editandoId), data);
    else { data.creadoEn = new Date().getTime(); await addDoc(collection(db, 'despensas', usuarioActual.id, col), data); }
    setMostrarForm(false);
  };

  const toggleCompra = async (item) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado }); };

  // ==========================================
  // RENDER: PANTALLA LOGIN (ESTILO ORIGINAL)
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative font-sans">
        <div className="absolute top-0 left-0 w-full p-6 flex justify-start z-10">
          <a href="https://quenosevenza.cl" className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100 hover:text-blue-600 transition-all">← Volver a la Web</a>
        </div>
        <div className="flex-1 flex flex-col justify-center items-center px-6">
          <div className="w-full max-w-sm mt-12 animate-in fade-in duration-700">
            <h1 className="text-4xl font-black text-center italic mb-10 tracking-tighter text-gray-900 uppercase">quenosevenza</h1>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-50">
              <div className="flex bg-gray-50 rounded-2xl p-1.5 mb-8">
                <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>CREAR CUENTA</button>
                <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>INGRESAR</button>
              </div>
              <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4">Nombre Hogar</label>
                  <input type="text" placeholder="Ej: LosRojas" className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800 border-2 border-transparent focus:border-blue-50" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4">PIN de Acceso</label>
                  <input type="password" placeholder="****" maxLength={4} className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em] text-gray-800 border-2 border-transparent focus:border-blue-50" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
                </div>
                {errorAuth && <div className="text-red-500 text-center text-[10px] font-black uppercase bg-red-50 p-3 rounded-xl border border-red-100">{errorAuth}</div>}
                <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-xs tracking-widest shadow-lg shadow-blue-100 active:scale-95 transition-all mt-4">{cargandoAuth ? 'CONECTANDO...' : (modoLogin === 'crear' ? 'ABRIR MI HOGAR' : 'ENTRAR AHORA')}</button>
              </div>
            </div>
            {/* ANUNCIO LOGIN */}
            <AdSenseBanner adSlot="login_footer" isTest={true} />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: APP (ESTILO ORIGINAL)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-6 flex justify-between items-center sticky top-0 bg-[#F8F9FB]/80 backdrop-blur-md z-20">
        <div>
          <h1 className="text-2xl font-black italic text-gray-900 tracking-tighter uppercase">quenosevenza</h1>
          <div className="flex items-center gap-1 mt-0.5">
             <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
             <p className="font-black text-[9px] uppercase tracking-widest text-blue-600">{usuarioActual.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="https://quenosevenza.cl" className="bg-white border border-gray-100 p-3 rounded-full text-blue-600 shadow-sm hover:scale-110 transition-transform"><Globe size={18} /></a>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-100 p-3 rounded-full text-indigo-600 shadow-sm hover:scale-110 transition-transform"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-100 p-3 rounded-full text-gray-300 hover:text-red-500 shadow-sm transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-4 mb-8">
           <Search size={20} className="text-gray-300" />
           <input type="text" placeholder="¿Qué buscas?" value={busqueda} onChange={e => setBusqueda(e.target.value)} className="flex-1 outline-none text-sm font-bold bg-transparent text-gray-800 placeholder:text-gray-300" />
        </div>

        {/* BARRA DE REGALO */}
        {tabActivo === 'comida' && !busqueda && (
          <div className="mb-10 animate-in slide-in-from-bottom-4 duration-500">
            <a href="https://tuweb.cl/wp-content/uploads/2026/04/guia-limpieza-abril.pdf" target="_blank" rel="noopener noreferrer" className="qnv-gift-card block shadow-xl active:scale-[0.98]">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3.5 rounded-2xl text-white shadow-lg shadow-blue-100"><Gift size={20} /></div>
                  <div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none mb-1.5">Regalo del Mes</p>
                    <h3 className="text-[13px] font-black text-gray-900 leading-tight">Guía Pro: Limpieza de Nevera</h3>
                  </div>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600"><ArrowRight size={18} /></div>
              </div>
            </a>
          </div>
        )}

        {/* LISTADO PRODUCTOS */}
        {tabActivo === 'comida' && (
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4 px-2">Control de Inventario</h2>
            {productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))
              .sort((a, b) => (a.sinFecha ? 1 : b.sinFecha ? -1 : new Date(a.fecha) - new Date(b.fecha)))
              .map(p => {
                const est = obtenerEstado(p);
                return (
                  <div key={p.id} className={`p-5 rounded-[1.8rem] border-2 flex items-center justify-between shadow-sm transition-all active:scale-[0.99] ${est.bg} ${est.border}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5"><span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white border border-inherit ${est.text}`}>{est.icono} {est.titulo}</span></div>
                      <h3 className="font-black text-[17px] text-gray-900 leading-tight">{p.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1 tracking-wider">{p.sinFecha ? 'Permanente' : `Vence: ${p.fecha.split('-').reverse().join('/')}`}</p>
                    </div>
                    <div className="flex items-center gap-4 pl-4 border-l border-black/5">
                      <div className="text-center min-w-[2.5rem]">
                         {p.sinFecha ? <Infinity size={24} className="text-gray-300 mx-auto"/> : <span className={`text-2xl font-black italic tracking-tighter ${est.text}`}>{Math.abs(calcularDias(p.fecha))}</span>}
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <button onClick={() => abrirFormulario(p, 'alimento')} className="text-gray-300 hover:text-blue-500 transition-colors"><Edit2 size={14}/></button>
                        <button onClick={() => solicitarBorrado(p, 'items', 'alimento')} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}

        {/* ANUNCIO APP */}
        <AdSenseBanner adSlot="app_main_content" isTest={true} />
      </main>

      {/* NAVEGACIÓN ORIGINAL */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-gray-50 pb-12 pt-5 px-8 z-40 flex justify-around">
        <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center gap-1.5 transition-all ${tabActivo === 'comida' ? 'text-blue-600 scale-110' : 'text-gray-300'}`}><Leaf size={24} className={tabActivo === 'comida' ? 'fill-blue-50' : ''}/><span className="text-[9px] font-black uppercase tracking-widest">Despensa</span></button>
        <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center gap-1.5 transition-all ${tabActivo === 'medicamentos' ? 'text-indigo-600 scale-110' : 'text-gray-300'}`}><Pill size={24} className={tabActivo === 'medicamentos' ? 'fill-indigo-50' : ''}/><span className="text-[9px] font-black uppercase tracking-widest">Botiquín</span></button>
        <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center gap-1.5 transition-all ${tabActivo === 'compras' ? 'text-green-600 scale-110' : 'text-gray-300'}`}><ShoppingCart size={24} className={tabActivo === 'compras' ? 'fill-green-50' : ''}/><span className="text-[9px] font-black uppercase tracking-widest">Lista</span></button>
      </nav>

      {/* BOTÓN PLUS ORIGINAL */}
      {tabActivo !== 'compras' && (
        <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="fixed bottom-32 right-8 w-16 h-16 bg-gray-900 text-white rounded-[2rem] shadow-2xl flex items-center justify-center z-30 active:scale-90 transition-all border-4 border-white"><Plus size={28} strokeWidth={3} /></button>
      )}

      {/* MODAL FORMULARIO (BORDE 2.5REM) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] p-10 pb-16 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-500">
            <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-8"></div>
            <h2 className="text-3xl font-black italic mb-8 text-gray-900 tracking-tighter uppercase">{editandoId ? 'Editar Ítem' : 'Nuevo Ingreso'}</h2>
            <div className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4">Nombre del Producto</label>
                <input type="text" placeholder="¿Qué es?" className="w-full p-5 bg-gray-50 rounded-[1.5rem] outline-none font-bold text-gray-800 border-2 border-transparent focus:border-blue-50" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              </div>
              <div className="flex items-center gap-4 bg-gray-50 p-5 rounded-[1.5rem] border-2 border-transparent transition-all">
                 <input type="checkbox" id="noVence" checked={nuevoItem.sinFecha} onChange={(e) => setNuevoItem({...nuevoItem, sinFecha: e.target.checked})} className="w-6 h-6 accent-blue-600 rounded-lg" />
                 <label htmlFor="noVence" className="text-sm font-black text-gray-600 cursor-pointer">Es un insumo permanente (Sin vencimiento)</label>
              </div>
              {!nuevoItem.sinFecha && (
                <div className="space-y-1 animate-in slide-in-from-top-2">
                  <label className="text-[10px] font-black text-gray-300 uppercase tracking-widest ml-4">Fecha de Vencimiento</label>
                  <input type="date" className="w-full p-5 bg-gray-50 rounded-[1.5rem] outline-none font-black text-gray-800 uppercase border-2 border-transparent focus:border-blue-50" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
                </div>
              )}
              <button disabled={!nuevoItem.nombre || (!nuevoItem.sinFecha && !nuevoItem.fecha)} onClick={agregarOEditarItem} className={`w-full text-white font-black p-6 rounded-[1.8rem] uppercase text-xs tracking-[0.2em] shadow-xl transition-all active:scale-95 ${nuevoItem.tipo === 'alimento' ? 'bg-gray-900' : 'bg-indigo-600'} disabled:opacity-20`}>GUARDAR CAMBIOS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;