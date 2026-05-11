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
// COMPONENTE SEGURO PARA ADSENSE
// ==========================================
const AdSenseBanner = ({ adSlot }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('Error cargando AdSense:', err);
    }
  }, []);

  return (
    <div className="w-full flex justify-center my-4 overflow-hidden min-h-[50px] rounded-xl">
      <ins className="adsbygoogle"
           style={{ display: 'block', width: '100%' }}
           data-ad-client="ca-pub-3386079946838939"
           data-ad-slot={adSlot}
           data-ad-format="auto"
           data-full-width-responsive="true"></ins>
    </div>
  );
};

const Dashboard = () => {
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = estilocss;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  // ==========================================
  // ESTADOS Y AUTENTICACIÓN
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
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);

  const pedirPermisoNotificaciones = async () => {
    if (!('Notification' in window)) { alert("Este navegador no soporta notificaciones."); return; }
    if (Notification.permission !== 'granted') {
      const permiso = await Notification.requestPermission();
      setPermisoNotif(permiso);
    } else {
       new Notification("Prueba de sonido", { body: "Las notificaciones están activas.", icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png" });
    }
  };

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
    } catch (error) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const dataUsuario = { id, pin };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
  };

  const cerrarSesion = () => {
    setUsuarioActual(null); 
    localStorage.removeItem('cv_usuario_activo');
  };

  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [itemABorrar, setItemABorrar] = useState(null); 
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: 'Sin Alarma', horaInicio: '08:00'
  });

  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), s => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompras = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), s => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubCompras(); };
    }
  }, [usuarioActual]);

  const abrirFormulario = (itemToEdit = null, tipoPredefinido = 'alimento') => {
    if (itemToEdit) {
      setEditandoId(itemToEdit.id);
      setNuevoItem({ tipo: tipoPredefinido, nombre: itemToEdit.nombre || '', fecha: itemToEdit.fecha || '', sinFecha: itemToEdit.sinFecha || false, dosis: itemToEdit.dosis || '', frecuencia: itemToEdit.frecuencia || 'Sin Alarma', horaInicio: itemToEdit.horaInicio || '08:00' });
    } else {
      setEditandoId(null);
      setNuevoItem({ tipo: tipoPredefinido, nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: 'Sin Alarma', horaInicio: '08:00' });
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
    setMostrarForm(false);
  };

  const confirmarBorradoEstadistica = async (estado) => {
    if (!itemABorrar) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { nombre: itemABorrar.nombre, tipo: itemABorrar.tipo, resultado: estado, fecha: new Date().getTime() });
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

  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black italic text-gray-900 tracking-tighter">quenosevenza</h1>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest mt-2">Panel de Control</p>
          </div>
          <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
            <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear</button>
            <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Entrar</button>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="ID del Hogar" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" value={inputId} onChange={(e) => setInputId(e.target.value)} />
            <input type="password" placeholder="PIN" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-center text-2xl tracking-[0.5em]" value={inputPin} maxLength={4} onChange={(e) => setInputPin(e.target.value)} />
            {errorAuth && <p className="text-red-500 text-xs font-bold text-center">{errorAuth}</p>}
            <button onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-sm shadow-lg shadow-blue-200">{cargandoAuth ? 'Cargando...' : 'Comenzar 🚀'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8F9FB] font-sans">
      
      {/* ==========================================
          SIDEBAR (Desktop)
         ========================================== */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-gray-100 fixed h-full z-30">
        <div className="p-8">
          <h1 className="text-2xl font-black italic tracking-tighter">quenosevenza</h1>
          <div className="flex items-center gap-2 mt-2 opacity-50">
            <Home size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{usuarioActual.id}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button onClick={() => setTabActivo('comida')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActivo === 'comida' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Leaf size={20} /> Despensa
          </button>
          <button onClick={() => setTabActivo('medicamentos')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActivo === 'medicamentos' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:bg-gray-50'}`}>
            <Pill size={20} /> Botiquín
          </button>
          <button onClick={() => setTabActivo('compras')} className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${tabActivo === 'compras' ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:bg-gray-50'}`}>
            <ShoppingCart size={20} /> Compras
          </button>
        </nav>

        <div className="p-6 space-y-4">
          <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="w-full bg-gray-900 text-white font-black p-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-transform">
            <Plus size={20} /> Añadir Nuevo
          </button>
          <button onClick={cerrarSesion} className="w-full text-gray-400 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:text-red-500 transition-colors">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ==========================================
          MAIN CONTENT (Full Width)
         ========================================== */}
      <main className="flex-1 lg:ml-72 p-6 md:p-10 pb-32">
        
        {/* Header Mobile / Search Desktop */}
        <header className="flex justify-between items-center mb-8">
          <div className="lg:hidden">
            <h1 className="text-2xl font-black italic">qnv</h1>
          </div>
          <div className="flex-1 max-w-xl mx-4 lg:mx-0">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 w-full">
              <Search size={18} className="text-gray-400" />
              <input type="text" placeholder="Buscar..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full outline-none font-bold text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMostrarQRCompartir(true)} className="p-3 bg-white rounded-full shadow-sm text-indigo-600"><Share2 size={20} /></button>
            <button onClick={cerrarSesion} className="lg:hidden p-3 bg-white rounded-full shadow-sm text-gray-400"><LogOut size={20} /></button>
          </div>
        </header>

        {/* Banner de Regalo */}
        {tabActivo === 'comida' && !busqueda && (
          <div className="mb-10 max-w-2xl">
            <a href="https://quenosevenza.cl/regalo/" className="qnv-gift-card block shadow-lg hover:scale-[1.01] transition-transform">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white"><Gift size={20} /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Especial del Mes</p>
                    <h3 className="text-sm font-black text-gray-900">Guía: Limpieza de Refrigerador</h3>
                  </div>
                </div>
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><ArrowRight size={18} /></div>
              </div>
            </a>
          </div>
        )}

        {/* GRID DE PRODUCTOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {(tabActivo === 'comida' ? productos : medicamentos)
            .filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
            .sort((a, b) => (a.sinFecha ? 1 : -1) || new Date(a.fecha) - new Date(b.fecha))
            .map((item) => {
              const est = obtenerEstado(item);
              const dias = item.sinFecha ? null : calcularDias(item.fecha);
              return (
                <div key={item.id} className={`p-6 rounded-[2rem] border-2 flex flex-col justify-between shadow-sm transition-all h-full ${est.bg} ${est.border}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs">{est.icono}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                      </div>
                      <h3 className="font-black text-lg text-gray-900 leading-tight">{item.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{item.sinFecha ? 'Permanente' : `Vence: ${item.fecha.split('-').reverse().join('/')}`}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button onClick={() => abrirFormulario(item, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="p-2 bg-white/50 rounded-full text-gray-400 hover:text-blue-600"><Edit2 size={14}/></button>
                      <button onClick={() => solicitarBorrado(item, tabActivo === 'comida' ? 'items' : 'medicamentos', tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="p-2 bg-white/50 rounded-full text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-black/5">
                    <div className="flex flex-col">
                      <span className={`text-2xl font-black leading-none ${est.text}`}>{item.sinFecha ? '∞' : Math.abs(dias)}</span>
                      <span className="text-[8px] font-black uppercase opacity-40">días restantes</span>
                    </div>
                    <button onClick={() => agregarACompras(item.nombre)} className="bg-white px-4 py-2 rounded-xl text-gray-900 font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-2">
                      <ShoppingCart size={12}/> Listar
                    </button>
                  </div>
                </div>
              )
            })
          }
        </div>

        <AdSenseBanner adSlot="3628760602" />
      </main>

      {/* ==========================================
          MOBILE NAVIGATION
         ========================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 pb-8 flex justify-around z-40">
        <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center gap-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-300'}`}>
          <Leaf size={24} /> <span className="text-[9px] font-black uppercase">Despensa</span>
        </button>
        <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center gap-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-300'}`}>
          <Pill size={24} /> <span className="text-[9px] font-black uppercase">Botiquín</span>
        </button>
        <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center gap-1 ${tabActivo === 'compras' ? 'text-green-600' : 'text-gray-300'}`}>
          <ShoppingCart size={24} /> <span className="text-[9px] font-black uppercase">Compras</span>
        </button>
      </nav>

      {/* FAB (Mobile Only) */}
      <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="lg:hidden fixed bottom-24 right-6 w-16 h-16 bg-gray-900 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 z-40">
        <Plus size={30} strokeWidth={3} />
      </button>

      {/* MODAL FORMULARIO */}
      {mostrarForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black italic">{editandoId ? 'Editar' : 'Añadir'}</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="¿Qué es?" className="w-full p-5 bg-gray-50 rounded-2xl outline-none font-bold text-lg" value={nuevoItem.nombre} onChange={e => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              <div className="flex items-center gap-3 bg-gray-50 p-5 rounded-2xl">
                <input type="checkbox" id="sf" checked={nuevoItem.sinFecha} onChange={e => setNuevoItem({...nuevoItem, sinFecha: e.target.checked})} className="w-5 h-5 accent-blue-600" />
                <label htmlFor="sf" className="font-bold text-gray-700">Sin vencimiento</label>
              </div>
              {!nuevoItem.sinFecha && (
                <input type="date" className="w-full p-5 bg-gray-50 rounded-2xl font-bold uppercase" value={nuevoItem.fecha} onChange={e => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
              )}
              <button onClick={agregarOEditarItem} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl uppercase tracking-widest text-sm">Guardar ✅</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BORRADO INTELIGENTE */}
      {itemABorrar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center shadow-2xl">
            <h3 className="text-2xl font-black italic mb-6">¿Qué pasó con esto?</h3>
            <div className="space-y-3">
              <button onClick={() => confirmarBorradoEstadistica('consumido')} className="w-full bg-green-100 text-green-700 font-black p-5 rounded-2xl flex items-center justify-center gap-3"><ThumbsUp size={20}/> Se consumió</button>
              <button onClick={() => confirmarBorradoEstadistica('basura')} className="w-full bg-red-100 text-red-700 font-black p-5 rounded-2xl flex items-center justify-center gap-3"><AlertTriangle size={20}/> Se perdió / venció</button>
              <button onClick={() => setItemABorrar(null)} className="mt-4 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;