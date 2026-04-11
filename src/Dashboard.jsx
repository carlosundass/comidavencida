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
    padding: 1px; /* Espacio para el borde animado */
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
    border-radius: 1.9rem; /* Un poco menor que la tarjeta para el borde */
    padding: 1rem;
    display: flex;
    justify-content: space-between;
    items-center;
    transition: background-color 0.3s;
  }
  .qnv-gift-card:hover .qnv-gift-content {
    background: #f0f7ff; /* Fondo azul clarito en hover */
  }
`;

const Dashboard = () => {
  // Inyectar el CSS dinámicamente al cargar el componente
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = estilocss;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet); 
    };
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

  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState('Notification' in window ? Notification.permission : 'denied');

  // ESTADOS PARA SUGERENCIAS
  const [mostrarFeedback, setMostrarFeedback] = useState(false);
  const [mensajeFeedback, setMensajeFeedback] = useState('');
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);

  const pedirPermisoNotificaciones = async () => {
    if (!('Notification' in window)) { alert("Este navegador no soporta notificaciones."); return; }
    if (Notification.permission !== 'granted') {
      const permiso = await Notification.requestPermission();
      setPermisoNotif(permiso);
      if (permiso === 'granted') {
        new Notification("¡Notificaciones activadas!", { body: "Ahora Que No Se Venza te avisará de tus medicamentos.", icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png" });
      }
    } else {
       new Notification("Prueba de sonido", { body: "Las notificaciones están funcionando correctamente.", icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png" });
    }
  };

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
          _subject: "💡 Sugerencia desde App: " + usuarioActual.id
        })
      });
      alert("¡Gracias! Recibimos tu sugerencia.");
      setMensajeFeedback('');
      setMostrarFeedback(false);
    } catch (e) {
      alert("Error al enviar. Intenta de nuevo.");
    } finally {
      setEnviandoFeedback(false);
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
        if (despensaSnap.exists()) { setErrorAuth('Ese nombre ya existe.'); } 
        else { await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!despensaSnap.exists()) { setErrorAuth('No encontramos esta cuenta.'); } 
        else if (despensaSnap.data().pin !== inputPin) { setErrorAuth('PIN incorrecto.'); } 
        else { iniciarSesion(idLimpio, inputPin); }
      }
    } catch (error) { setErrorAuth('Error de conexión.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const dataUsuario = { id, pin };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId(''); setInputPin(''); setTabActivo('comida'); setBusqueda('');
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
  const [alarmasEnviadas, setAlarmasEnviadas] = useState(new Set());
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', fecha: '', sinFecha: false, dosis: '', frecuencia: '8', horaInicio: '08:00'
  });

  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), s => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompras = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), s => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubCompras(); };
    }
  }, [usuarioActual]);

  const registrarToma = async (idMedicamento) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'medicamentos', idMedicamento), { ultimaToma: new Date().getTime() }); };

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
    setMostrarForm(false);
  };

  const confirmarBorradoEstadistica = async (estado) => {
    if (!itemABorrar) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { nombre: itemABorrar.nombre, tipo: itemABorrar.tipo, resultado: estado, fecha: new Date().getTime() });
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, itemABorrar.coleccion, itemABorrar.id));
    setItemABorrar(null);
  };

  const toggleCompra = async (item) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado }); };

  const calcularDias = (f) => { if (!f) return 999; return Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24)); };
  
  const obtenerEstado = (item) => {
    if (item.sinFecha) return { titulo: 'INSUMO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-600', icono: '📦' };
    const dias = calcularDias(item.fecha);
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // ==========================================
  // RENDER: LOGIN
  // ==========================================
  if (!usuarioActual) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black italic tracking-tighter text-gray-900">quenosevenza</h1>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => setModoLogin('crear')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear</button>
              <button onClick={() => setModoLogin('entrar')} className={`flex-1 py-3 text-sm font-black rounded-xl ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Entrar</button>
            </div>
            <div className="space-y-4">
              <input type="text" placeholder="Hogar" className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
              <input type="password" placeholder="PIN" className="w-full p-4 bg-gray-50 rounded-2xl font-black text-center text-2xl" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
              {errorAuth && <div className="text-red-600 text-xs font-bold text-center">{errorAuth}</div>}
              <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase">{cargandoAuth ? '...' : 'Ir 🚀'}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=QNV-LOGIN|${usuarioActual.id}|${usuarioActual.pin}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black italic text-gray-900 leading-none">quenosevenza</h1>
          <p className="font-bold text-[10px] uppercase tracking-widest text-blue-600">{usuarioActual.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BOTÓN SUGERENCIAS */}
          <button onClick={() => setMostrarFeedback(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-amber-500 shadow-sm"><BookOpen size={18} /></button>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-indigo-600 shadow-sm"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 shadow-sm"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        {/* BANNER REGALO */}
        {tabActivo === 'comida' && (
          <div className="mb-8 animate-in zoom-in-95">
            <a href="https://quenosevenza.cl/regalo/" className="qnv-gift-card block shadow-lg">
              <div className="qnv-gift-content">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-600 p-3 rounded-xl text-white shadow-sm"><Gift size={18} /></div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">Regalo de Abril</p>
                    <h3 className="text-sm font-black text-gray-900 leading-tight">Guía Pro: Limpieza de Refrigerador</h3>
                  </div>
                </div>
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><ArrowRight size={16} /></div>
              </div>
            </a>
          </div>
        )}

        {/* LISTADOS */}
        {tabActivo === 'comida' && productos.map((p) => {
          const est = obtenerEstado(p);
          const dias = p.sinFecha ? null : calcularDias(p.fecha);
          return (
            <div key={p.id} className={`p-5 mb-3 rounded-[1.5rem] border-2 flex items-center justify-between ${est.bg} ${est.border}`}>
              <div>
                <h3 className="font-black text-[16px] text-gray-900">{p.nombre}</h3>
                <p className="text-[10px] font-bold text-gray-500 uppercase">{p.sinFecha ? 'INSUMO' : `Vence: ${p.fecha}`}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirFormulario(p, 'alimento')} className="p-2 bg-white rounded-full shadow-sm"><Edit2 size={12} /></button>
                <button onClick={() => solicitarBorrado(p, 'items', 'alimento')} className="p-2 bg-white rounded-full shadow-sm text-red-500"><Trash2 size={12} /></button>
              </div>
          </div>
          );
        })}

        {/* REPLICAR LÓGICA MEDICAMENTOS Y COMPRAS SEGÚN TU DISEÑO... */}
      </main>

      {/* NAVEGACIÓN */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around py-4 z-40">
        <button onClick={() => setTabActivo('comida')} className={tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}><Leaf size={24} /></button>
        <button onClick={() => setTabActivo('medicamentos')} className={tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}><Pill size={24} /></button>
        <button onClick={() => setTabActivo('compras')} className={tabActivo === 'compras' ? 'text-green-600' : 'text-gray-400'}><ShoppingCart size={24} /></button>
      </nav>

      {/* MODAL SUGERENCIAS (NUEVO) */}
      {mostrarFeedback && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black italic text-gray-900 mb-2">¿Cómo mejorar? 💡</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Tu idea puede ser la próxima función.</p>
            <textarea 
              className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-sm h-32 resize-none"
              placeholder="Cuéntanos tu sugerencia..."
              value={mensajeFeedback}
              onChange={(e) => setMensajeFeedback(e.target.value)}
            />
            <div className="flex flex-col gap-3 mt-6">
              <button 
                onClick={enviarFeedback}
                disabled={enviandoFeedback || !mensajeFeedback.trim()}
                className="w-full bg-blue-600 text-white font-black p-4 rounded-2xl disabled:opacity-50"
              >
                {enviandoFeedback ? 'Enviando...' : 'Enviar Sugerencia'}
              </button>
              <button onClick={() => setMostrarFeedback(false)} className="text-gray-400 font-bold text-[10px] uppercase p-2">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE AÑADIR */}
      <div className="fixed bottom-[100px] right-6 z-30">
        <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center"><Plus size={24} /></button>
      </div>

      {/* MODALES DE BORRADO, COMPARTIR Y FORMULARIO... */}
    </div>
  );
};

export default Dashboard;