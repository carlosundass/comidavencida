import React, { useState, useEffect } from 'react';
import { Trash2, X, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2, Edit2, ShoppingCart, CheckCircle2, BellRing, Bell, Search, BookOpen, ThumbsUp, AlertTriangle, Menu } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ==========================================
// COMPONENTE SEGURO PARA ADSENSE EN REACT
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
    <div className="w-full flex justify-center my-6 overflow-hidden min-h-[50px] bg-gray-50 rounded-xl">
      <ins className="adsbygoogle"
           style={{ display: 'inline-block', width: '320px', height: '100px' }}
           data-ad-client="ca-pub-3386079946838939"
           data-ad-slot={adSlot}></ins>
    </div>
  );
};

const Dashboard = () => {
  // ==========================================
  // ESTADOS PRINCIPALES Y AUTENTICACIÓN
  // ==========================================
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

  // MENÚ PÚBLICO
  const [menuPublicoAbierto, setMenuPublicoAbierto] = useState(false);

  // ESTADOS PARA EL QR
  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);
  const [permisoNotif, setPermisoNotif] = useState('Notification' in window ? Notification.permission : 'denied');

  const pedirPermisoNotificaciones = async () => {
    if (!('Notification' in window)) { alert("Este navegador no soporta notificaciones."); return; }
    if (Notification.permission !== 'granted') {
      const permiso = await Notification.requestPermission();
      setPermisoNotif(permiso);
      if (permiso === 'granted') {
        new Notification("¡Notificaciones activadas!", { body: "Ahora Que No Venza te avisará de tus medicamentos.", icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png" });
      }
    } else {
       new Notification("Prueba de sonido", { body: "Las notificaciones están funcionando correctamente.", icon: "https://cdn-icons-png.flaticon.com/512/883/883407.png" });
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
        if (despensaSnap.exists()) { setErrorAuth('Ese nombre de hogar ya existe. Elige otro.'); } 
        else { await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() }); iniciarSesion(idLimpio, inputPin); }
      } else {
        if (!despensaSnap.exists()) { setErrorAuth('No encontramos esta cuenta.'); } 
        else if (despensaSnap.data().pin !== inputPin) { setErrorAuth('El PIN es incorrecto.'); } 
        else { iniciarSesion(idLimpio, inputPin); }
      }
    } catch (error) { setErrorAuth('Error de conexión. Revisa tu internet.'); } finally { setCargandoAuth(false); }
  };

  const iniciarSesion = (id, pin) => {
    const dataUsuario = { id, pin };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId(''); setInputPin(''); setTabActivo('comida'); setBusqueda('');
    if ('Notification' in window && Notification.permission === 'default') {
       Notification.requestPermission().then(p => setPermisoNotif(p));
    }
  };

  const cerrarSesion = () => {
    setUsuarioActual(null); localStorage.removeItem('cv_usuario_activo');
    setProductos([]); setMedicamentos([]); setCompras([]); setVista('landing'); setBusqueda(''); setMenuPublicoAbierto(false);
  };

  const procesarQRLogin = async (codigoQR) => {
    setMostrarScannerLogin(false);
    if (codigoQR.startsWith('CV-LOGIN|') || codigoQR.startsWith('QNV-LOGIN|')) {
      const [, qrId, qrPin] = codigoQR.split('|');
      setCargandoAuth(true); setErrorAuth('');
      try {
        const despensaRef = doc(db, 'despensas', qrId);
        const despensaSnap = await getDoc(despensaRef);
        if (!despensaSnap.exists() || despensaSnap.data().pin !== qrPin) { setErrorAuth('El código QR es inválido o el PIN cambió.'); } 
        else { iniciarSesion(qrId, qrPin); }
      } catch(e) { setErrorAuth('Error al leer el QR.'); } finally { setCargandoAuth(false); }
    } else { setErrorAuth('Ese código QR no es una invitación de Que No Venza.'); }
  };

  // ==========================================
  // LÓGICA DE DATOS Y ALARMAS
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]);
  
  const [busqueda, setBusqueda] = useState('');
  const [itemABorrar, setItemABorrar] = useState(null); 
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [alarmasEnviadas, setAlarmasEnviadas] = useState(new Set());
  
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento', nombre: '', fecha: '', dosis: '', frecuencia: '8', horaInicio: '08:00', duracion: '7', esSiempre: false
  });

  useEffect(() => {
    if (usuarioActual) {
      const unsubItems = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'items'), s => setProductos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubMeds = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), s => setMedicamentos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      const unsubCompras = onSnapshot(collection(db, 'despensas', usuarioActual.id, 'compras'), s => setCompras(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      return () => { unsubItems(); unsubMeds(); unsubCompras(); };
    }
  }, [usuarioActual]);

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
          const [horas, mins] = m.horaInicio.split(':');
          const fechaInicio = new Date(); fechaInicio.setHours(parseInt(horas), parseInt(mins), 0, 0); msProximaToma = fechaInicio.getTime();
        }
        if (msProximaToma > 0 && ahora >= msProximaToma && (ahora - msProximaToma < 60000)) {
          const idNotificacion = `${m.id}-${msProximaToma}`;
          if (!alarmasEnviadas.has(idNotificacion)) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('¡Hora de tu medicina!', { body: `Toca: ${m.nombre} (${m.dosis || 'revisa la app'})`, icon: 'https://cdn-icons-png.flaticon.com/512/883/883407.png', vibrate: [200, 100, 200, 100, 200] });
            }
            setAlarmasEnviadas(prev => new Set(prev).add(idNotificacion));
          }
        }
      });
    };
    revisarAlarmas(); const intervalo = setInterval(revisarAlarmas, 10000); return () => clearInterval(intervalo);
  }, [usuarioActual, medicamentos, alarmasEnviadas]);

  const checkAlarmaVisual = (m) => {
    if (!m.frecuencia || m.frecuencia === 'Sin Alarma') return false;
    const horasFrec = parseInt(m.frecuencia); if (isNaN(horasFrec)) return false;
    let msProximaToma = 0;
    if (m.ultimaToma) msProximaToma = m.ultimaToma + (horasFrec * 60 * 60 * 1000);
    else if (m.horaInicio) {
      const [horas, mins] = m.horaInicio.split(':'); const d = new Date(); d.setHours(parseInt(horas), parseInt(mins), 0, 0); msProximaToma = d.getTime();
    }
    return msProximaToma > 0 && new Date().getTime() >= msProximaToma;
  };

  const registrarToma = async (idMedicamento) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'medicamentos', idMedicamento), { ultimaToma: new Date().getTime() }); };

  const abrirFormulario = (itemToEdit = null, tipoPredefinido = 'alimento') => {
    if (itemToEdit) {
      setEditandoId(itemToEdit.id);
      setNuevoItem({ tipo: tipoPredefinido, nombre: itemToEdit.nombre || '', fecha: itemToEdit.fecha || '', dosis: itemToEdit.dosis || '', frecuencia: itemToEdit.frecuencia || '8', horaInicio: itemToEdit.horaInicio || '08:00', duracion: itemToEdit.duracion || '7', esSiempre: itemToEdit.esSiempre || false });
    } else {
      setEditandoId(null);
      setNuevoItem({ tipo: tipoPredefinido, nombre: '', fecha: '', dosis: '', frecuencia: '8', horaInicio: '08:00', duracion: '7', esSiempre: false });
    }
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    const coleccionDestino = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const datos = { nombre: nuevoItem.nombre, fecha: nuevoItem.fecha || '', actualizadoEn: new Date().getTime() };
    if (nuevoItem.tipo === 'medicamento') {
      datos.dosis = nuevoItem.dosis || ''; datos.frecuencia = nuevoItem.frecuencia; datos.horaInicio = nuevoItem.horaInicio; datos.duracion = nuevoItem.duracion; datos.esSiempre = nuevoItem.esSiempre;
      if (!editandoId) datos.ultimaToma = null; 
    }
    if (editandoId) await updateDoc(doc(db, 'despensas', usuarioActual.id, coleccionDestino, editandoId), datos);
    else { datos.creadoEn = new Date().getTime(); await addDoc(collection(db, 'despensas', usuarioActual.id, coleccionDestino), datos); }
    setMostrarForm(false); setEditandoId(null);
  };

  const solicitarBorrado = (item, coleccion, tipo) => { setItemABorrar({ id: item.id, nombre: item.nombre, coleccion, tipo }); };

  const confirmarBorradoEstadistica = async (estado) => {
    if (!itemABorrar) return;
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'historial'), { nombre: itemABorrar.nombre, tipo: itemABorrar.tipo, resultado: estado, fecha: new Date().getTime() });
    await deleteDoc(doc(db, 'despensas', usuarioActual.id, itemABorrar.coleccion, itemABorrar.id));
    setItemABorrar(null);
  };

  const borrarItemDirecto = async (itemId, coleccion) => { await deleteDoc(doc(db, 'despensas', usuarioActual.id, coleccion, itemId)); };
  const agregarACompras = async (nombre) => { await addDoc(collection(db, 'despensas', usuarioActual.id, 'compras'), { nombre, comprado: false, creadoEn: new Date().getTime() }); };
  const toggleCompra = async (item) => { await updateDoc(doc(db, 'despensas', usuarioActual.id, 'compras', item.id), { comprado: !item.comprado }); };

  const calcularDias = (f) => { if (!f) return 999; return Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24)); };
  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  const productosFiltrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
  const medicamentosFiltrados = medicamentos.filter(m => m.nombre.toLowerCase().includes(busqueda.toLowerCase()));

  // ==========================================
  // RENDER RUTAS PÚBLICAS Y MENÚ (LANDING, GUÍAS, ETC)
  // ==========================================
  if (!usuarioActual && vista !== 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col font-sans">
        
        {/* CABECERA PÚBLICA CON MENÚ HAMBURGUESA */}
        <header className="p-6 bg-white shadow-sm sticky top-0 z-50">
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-3">
                <button onClick={() => setMenuPublicoAbierto(!menuPublicoAbierto)} className="p-1 text-gray-600 hover:text-blue-600 transition-colors">
                  {menuPublicoAbierto ? <X size={24} /> : <Menu size={24} />}
                </button>
                <h1 className="text-2xl font-black italic text-gray-900 cursor-pointer" onClick={() => {setVista('landing'); setMenuPublicoAbierto(false);}}>quenovenza</h1>
             </div>
             <button onClick={() => { setVista('login'); setModoLogin('entrar'); setMenuPublicoAbierto(false); }} className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Entrar</button>
          </div>
          
          {/* DESPLEGABLE DEL MENÚ */}
          {menuPublicoAbierto && (
            <nav className="mt-4 flex flex-col gap-1 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
              <button onClick={() => {setVista('landing'); setMenuPublicoAbierto(false);}} className={`text-left font-bold p-3 rounded-xl flex items-center gap-3 ${vista === 'landing' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}><Home size={18} className={vista === 'landing' ? 'text-blue-600' : 'text-gray-400'}/> Inicio</button>
              <button onClick={() => {setVista('guias'); setMenuPublicoAbierto(false);}} className={`text-left font-bold p-3 rounded-xl flex items-center gap-3 ${vista === 'guias' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}><BookOpen size={18} className={vista === 'guias' ? 'text-blue-600' : 'text-gray-400'}/> Guías y Tips (SEO)</button>
              <button onClick={() => {setVista('contacto'); setMenuPublicoAbierto(false);}} className={`text-left font-bold p-3 rounded-xl flex items-center gap-3 ${vista === 'contacto' ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'}`}><Tag size={18} className={vista === 'contacto' ? 'text-blue-600' : 'text-gray-400'}/> Contacto</button>
              <div className="h-px bg-gray-100 my-2"></div>
              <button onClick={() => {setVista('privacidad'); setMenuPublicoAbierto(false);}} className={`text-left font-bold p-3 rounded-xl text-sm ${vista === 'privacidad' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Política de Privacidad</button>
              <button onClick={() => {setVista('terminos'); setMenuPublicoAbierto(false);}} className={`text-left font-bold p-3 rounded-xl text-sm ${vista === 'terminos' ? 'text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>Términos y Condiciones</button>
            </nav>
          )}
        </header>

        <main className="flex-1 p-6 max-w-2xl mx-auto w-full relative z-10">
           
           {/* --- VISTA: INICIO BONITO Y LIMPIO --- */}
           {vista === 'landing' && (
              <div className="animate-in fade-in duration-300">
                 <div className="text-center mt-6 mb-10">
                    <div className="inline-block bg-green-100 text-green-700 font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest mb-4 shadow-sm">Herramienta 100% Gratuita</div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-4">Evita el desperdicio y <span className="text-blue-600">ahorra dinero</span>.</h2>
                    <p className="text-gray-600 font-medium text-lg leading-relaxed">La herramienta sin costo para organizar tu refrigerador, despensa y tu botiquín médico familiar.</p>
                 </div>
                 
                 <AdSenseBanner adSlot="PON_TU_SLOT_AQUI_1" />

                 <div className="space-y-4 mb-10">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="bg-green-100 text-green-600 p-3 rounded-full h-fit"><DollarSign size={24} /></div>
                      <div><h3 className="font-black text-gray-900 mb-1">Ahorro Inteligente</h3><p className="text-gray-500 text-sm">Organizar tu despensa evita comprar productos duplicados.</p></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="bg-blue-100 text-blue-600 p-3 rounded-full h-fit"><Leaf size={24} /></div>
                      <div><h3 className="font-black text-gray-900 mb-1">Impacto Ambiental</h3><p className="text-gray-500 text-sm">El desperdicio de comida es un problema ecológico grave.</p></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
                      <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full h-fit"><BellRing size={24} /></div>
                      <div><h3 className="font-black text-gray-900 mb-1">Botiquín y Notificaciones</h3><p className="text-gray-500 text-sm">Registra medicinas y recibe alarmas cuando te toque la dosis.</p></div>
                    </div>
                 </div>
                 <button onClick={() => { setVista('login'); setModoLogin('crear'); }} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm flex justify-center items-center gap-3 mb-10 transition-transform">
                    <QrCode size={22}/> <span>Crear Hogar Gratis</span> <ArrowRight size={18} />
                 </button>
              </div>
           )}

           {/* --- VISTA: GUÍAS Y TIPS SEO (TEXTOS DE ADSENSE) --- */}
           {vista === 'guias' && (
              <div className="animate-in fade-in duration-300">
                 <h3 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-3"><BookOpen className="text-blue-500" size={32}/> Guías Prácticas</h3>
                 <div className="bg-white p-8 md:p-10 rounded-3xl shadow-sm border border-gray-100 mb-8">
                   
                   <h4 className="text-2xl font-bold text-gray-800 mb-4 leading-tight">Cómo organizar tu refrigerador para que la comida dure el doble</h4>
                   <p className="text-gray-600 leading-relaxed text-sm mb-4">El orden en el que guardas tus alimentos dentro del refrigerador es vital para su conservación. Cada estante tiene una temperatura diferente, y colocar los productos incorrectamente es la causa principal de que se echen a perder antes de tiempo. En las bandejas superiores, donde la temperatura es más constante, debes guardar los alimentos que no necesitan cocinarse, como las sobras, bebidas o comidas preparadas.</p>
                   <p className="text-gray-600 leading-relaxed text-sm mb-10 pb-10 border-b border-gray-100">Por otro lado, los cajones inferiores están diseñados para mantener la humedad ideal de las frutas y verduras, evitando que se marchiten. Usar una herramienta como <strong>Que No Venza</strong> te permite catalogar estos alimentos y recibir una alerta con nuestro sistema de semáforo antes de que su vida útil termine, reduciendo drásticamente el impacto ambiental y el gasto económico mensual de tu familia.</p>

                   <h4 className="text-2xl font-bold text-gray-800 mb-4 leading-tight">Botiquín Seguro: Lo que necesitas saber sobre la caducidad</h4>
                   <p className="text-gray-600 leading-relaxed text-sm mb-4">Mantener un botiquín médico organizado no es un lujo, es una necesidad para la salud familiar. La caducidad de un medicamento no significa simplemente que deja de ser efectivo; en muchos casos, los compuestos químicos pueden alterarse y volverse perjudiciales o generar efectos secundarios adversos. Es imperativo revisar el estado de los jarabes, pastillas y cremas al menos cada tres meses.</p>
                   <p className="text-gray-600 leading-relaxed text-sm mb-10 pb-10 border-b border-gray-100">Con nuestra aplicación gratuita, puedes digitalizar todo tu botiquín en minutos. Al registrar la fecha de vencimiento y la dosis recetada, la plataforma se encarga de enviarte <strong>notificaciones push directamente a tu celular</strong>, asegurando que tú y tus seres queridos sigan el plan de tratamiento al pie de la letra y sin riesgos de consumir remedios en mal estado.</p>

                   <h4 className="text-2xl font-bold text-gray-800 mb-4 leading-tight">El costo oculto del desperdicio de alimentos y cómo evitarlo</h4>
                   <p className="text-gray-600 leading-relaxed text-sm mb-4">Según la ONU, casi un tercio de todos los alimentos producidos a nivel mundial se pierde o se desperdicia. Esto no solo representa un problema ético y ecológico masivo, con millones de toneladas de gases de efecto invernadero emitidos en vano, sino también un agujero silencioso en la economía de tu hogar. Cada vez que botas comida que se pudrió por olvido, estás botando dinero directamente a la basura.</p>
                   <p className="text-gray-600 leading-relaxed text-sm">La solución empieza por la planificación y el inventario. Al saber exactamente qué tienes en tu despensa mediante un registro digital como el que ofrece nuestra app, evitas comprar productos duplicados en el supermercado. La clave está en consumir primero lo que está por vencer, creando un ciclo sostenible y económico en tu hogar.</p>
                 </div>
                 <AdSenseBanner adSlot="PON_TU_SLOT_AQUI_2" />
              </div>
           )}

           {/* --- VISTA: CONTACTO --- */}
           {vista === 'contacto' && (
              <div className="animate-in fade-in duration-300 mt-10">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border border-gray-100">
                  <h1 className="text-3xl font-black mb-4 text-gray-900 italic">Contacto</h1>
                  <p className="text-gray-500 text-sm mb-8 leading-relaxed">¿Tienes dudas, sugerencias de nuevas funciones o encontraste algún error en la aplicación? ¡Nos encantaría escucharte!</p>
                  <a href="mailto:hola@quenovenza.cl" className="inline-block w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm transition-transform">Enviar un correo</a>
                  <p className="mt-6 text-xs text-gray-400">Nuestro equipo te responderá lo antes posible.</p>
                </div>
              </div>
           )}

           {/* --- VISTA: PRIVACIDAD --- */}
           {vista === 'privacidad' && (
              <div className="animate-in fade-in duration-300">
                 <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mt-4">
                    <h1 className="text-2xl font-black mb-6 text-gray-900">Política de Privacidad</h1>
                    <div className="text-gray-600 space-y-4 text-sm leading-relaxed"><p><strong>Última actualización: Abril 2026</strong></p><p>En Que No Venza, nos tomamos muy en serio tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos tu información cuando utilizas nuestra herramienta de gestión de hogar.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">1. Información que recopilamos</h3><p>No recopilamos información personal identificable como nombres reales, correos electrónicos o números de teléfono. Solo almacenamos el "Nombre de Hogar" y el "PIN" que tú mismo creas para acceder a tu cuenta privada, además de los datos de los alimentos, medicamentos y lista de compras que ingresas voluntariamente.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">2. Publicidad (Google AdSense)</h3><p>Utilizamos Google AdSense para mostrar anuncios y mantener este servicio gratuito. Google utiliza cookies para publicar anuncios basados en tus visitas anteriores a nuestra aplicación u otros sitios web de Internet. Puedes inhabilitar la publicidad personalizada visitando la Configuración de anuncios de Google.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">3. Almacenamiento de Datos</h3><p>Tus datos de inventario se almacenan de forma segura utilizando los servicios en la nube de Google (Firebase Firestore). No vendemos, alquilamos ni compartimos tus datos de inventario con terceros bajo ninguna circunstancia.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">4. Uso de Cookies</h3><p>Utilizamos cookies propias y de terceros para gestionar la sesión, recordar tus preferencias de idioma y analizar el tráfico para mejorar el servicio. Al utilizar la app, aceptas el uso de cookies.</p></div>
                 </div>
              </div>
           )}

           {/* --- VISTA: TÉRMINOS --- */}
           {vista === 'terminos' && (
              <div className="animate-in fade-in duration-300">
                 <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 mt-4">
                    <h1 className="text-2xl font-black mb-6 text-gray-900">Términos y Condiciones</h1>
                    <div className="text-gray-600 space-y-4 text-sm leading-relaxed"><h3 className="font-bold text-gray-900 mt-6 mb-2">1. Servicio 100% Gratuito</h3><p>Que No Venza se ofrece de manera completamente gratuita para todos los usuarios. No existen cargos ocultos, versiones premium ni suscripciones. La plataforma se mantiene operativa y en constante mejora gracias a la publicidad mostrada en pantalla.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">2. Aceptación de los Términos</h3><p>Al acceder y utilizar la plataforma Que No Venza, aceptas estar sujeto a estos Términos y Condiciones en su totalidad. Si no estás de acuerdo con alguna parte, por favor no utilices la aplicación.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">3. Uso de la Aplicación</h3><p>Que No Venza es una herramienta de organización personal y familiar. Eres el único responsable de mantener la confidencialidad de tu ID de Hogar y PIN para proteger tu información.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">4. Limitación de Responsabilidad Médica y de Salud</h3><p>Esta aplicación proporciona cálculos estimativos de fechas de vencimiento y sistemas de alarmas para recordatorios. <strong>No somos un servicio médico.</strong> No nos hacemos responsables por alimentos consumidos en mal estado, intoxicaciones, pérdidas económicas, olvidos de medicación o cualquier problema de salud derivado del uso de la información ingresada. La revisión final del estado real del alimento o el cumplimiento estricto de la dosis es responsabilidad exclusiva del usuario.</p><h3 className="font-bold text-gray-900 mt-6 mb-2">5. Derechos de Autor</h3><p>El código, el diseño visual, y el contenido de este sitio son propiedad de Que No Venza y están protegidos por leyes de propiedad intelectual.</p></div>
                 </div>
              </div>
           )}

        </main>
        
        <footer className="bg-gray-100 p-8 text-center text-xs text-gray-500 font-medium mt-auto relative z-10 border-t border-gray-200">
          <p>© 2026 Que No Venza. Una solución familiar para la gestión inteligente del hogar.</p>
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER: PANTALLA LOGIN
  // ==========================================
  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative font-sans">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">← Volver</button>
        <div className="w-full max-w-sm mt-10">
          <div className="text-center mb-10"><h1 className="text-4xl font-black tracking-tighter text-gray-900 italic">quenovenza</h1><p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-2">Acceso Seguro</p></div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => { setModoLogin('crear'); setErrorAuth(''); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Crear Nuevo</button>
              <button onClick={() => { setModoLogin('entrar'); setErrorAuth(''); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Ingresar</button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2"><Home size={12} className="inline mr-1"/> Nombre del Hogar</label><input type="text" placeholder="Ej: FamiliaRojas" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-gray-800" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2"><Lock size={12} className="inline mr-1"/> PIN (4 números)</label><input type="password" inputMode="numeric" maxLength={4} placeholder="****" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em] text-gray-800" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} /></div>
              {errorAuth && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100 animate-in fade-in">{errorAuth}</div>}
              <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl uppercase text-sm mt-4 active:scale-95 transition-transform">{cargandoAuth ? 'Conectando...' : (modoLogin === 'crear' ? 'Abrir Hogar 🚀' : 'Entrar ✅')}</button>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">O entrar con invitación</p>
              <button onClick={() => setMostrarScannerLogin(true)} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 font-black p-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all"><QrCode size={20} /> Escanear QR</button>
            </div>
          </div>
        </div>
        {mostrarScannerLogin && <Scanner onScan={procesarQRLogin} onClose={() => setMostrarScannerLogin(false)} />}
      </div>
    );
  }

  // ==========================================
  // RENDER: DASHBOARD PRINCIPAL Y LÓGICA DE FILTROS
  // ==========================================
  const qrData = `QNV-LOGIN|${usuarioActual?.id || 'error'}|${usuarioActual?.pin || '0000'}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none italic">quenovenza</h1>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Home size={12} className="text-blue-600" />
            <p className="font-bold text-[10px] uppercase tracking-widest text-gray-800">{usuarioActual.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={pedirPermisoNotificaciones} className={`bg-white border border-gray-200 p-2.5 rounded-full hover:bg-blue-50 shadow-sm ${permisoNotif === 'granted' ? 'text-green-500' : 'text-gray-400'}`}><Bell size={18} /></button>
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-blue-600 hover:bg-blue-50 shadow-sm"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2 relative z-10">
        {/* BUSCADOR INTELIGENTE (Visible en Comida y Medicamentos) */}
        {(tabActivo === 'comida' || tabActivo === 'medicamentos') && (
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 mb-6 animate-in slide-in-from-top-4">
             <Search size={18} className="text-gray-400 ml-1" />
             <input type="text" placeholder={`Buscar en ${tabActivo}...`} value={busqueda} onChange={e => setBusqueda(e.target.value)} className="flex-1 outline-none text-sm font-bold text-gray-700 bg-transparent" />
             {busqueda && <button onClick={()=>setBusqueda('')} className="bg-gray-100 p-1.5 rounded-full hover:bg-gray-200"><X size={14} className="text-gray-500"/></button>}
          </div>
        )}

        {/* TAB 1: COMIDA */}
        {tabActivo === 'comida' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo de Alimentos</h2>
            {productosFiltrados.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">{busqueda ? 'No hay resultados' : 'Todo al día'}</p>
                <p className="text-gray-400 text-sm mt-1">{busqueda ? 'Prueba con otra palabra' : 'Tu despensa está vacía ☁️'}</p>
              </div>
            )}
            <div className="space-y-3">
              {productosFiltrados.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
                const dias = calcularDias(p.fecha); const est = obtenerEstado(dias);
                return (
                  <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm transition-all ${est.bg} ${est.border}`}>
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px]">{est.icono}</span><span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span></div>
                      <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.nombre}</h3>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                    </div>
                    <div className="flex items-center gap-1 pl-3 border-l border-black/10">
                      <div className="text-center min-w-[3rem] mr-1">
                        <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-50`}>días</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => abrirFormulario(p, 'alimento')} className="text-gray-400 hover:text-blue-500 p-1.5 bg-white rounded-full shadow-sm"><Edit2 size={12} /></button>
                        <button onClick={() => agregarACompras(p.nombre)} className="text-gray-400 hover:text-green-500 p-1.5 bg-white rounded-full shadow-sm" title="Añadir a Compras"><ShoppingCart size={12} /></button>
                        <button onClick={() => solicitarBorrado(p, 'items', 'alimento')} className="text-gray-400 hover:text-red-500 p-1.5 bg-white rounded-full shadow-sm"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <AdSenseBanner adSlot="PON_TU_SLOT_AQUI_3" />
          </div>
        )}

        {/* TAB 2: MEDICAMENTOS */}
        {tabActivo === 'medicamentos' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Botiquín y Tratamientos</h2>
            {medicamentosFiltrados.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">{busqueda ? 'No hay resultados' : 'Botiquín vacío'}</p>
                <p className="text-gray-400 text-sm mt-1">{busqueda ? 'Prueba con otra palabra' : 'Añade medicamentos y alarmas 💊'}</p>
              </div>
            )}
            <div className="space-y-3">
              {medicamentosFiltrados.sort((a,b) => new Date(a.fecha || '2099-01-01') - new Date(b.fecha || '2099-01-01')).map((m) => {
                const dias = m.fecha ? calcularDias(m.fecha) : 999;
                const est = m.fecha ? obtenerEstado(dias) : { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-700', titulo: 'ACTIVO', icono: '💊' };
                const alarmaSonando = checkAlarmaVisual(m);
                
                return (
                  <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 flex flex-col justify-between shadow-sm transition-colors ${alarmaSonando ? 'bg-red-100 border-red-300 shadow-xl' : est.bg + ' ' + est.border}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1"><span className="text-[10px]">{est.icono}</span><span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span></div>
                        <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{m.nombre}</h3>
                        {m.fecha && <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {m.fecha.split('-').reverse().join('/')}</p>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => abrirFormulario(m, 'medicamento')} className="text-gray-400 hover:text-blue-500 p-1.5 bg-white rounded-full shadow-sm"><Edit2 size={14} /></button>
                        <button onClick={() => solicitarBorrado(m, 'medicamentos', 'medicamento')} className="text-gray-400 hover:text-red-500 p-1.5 bg-white rounded-full shadow-sm"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    
                    {m.frecuencia !== 'Sin Alarma' && (
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${alarmaSonando ? 'bg-red-500 border-red-600 shadow-md' : 'bg-white/60 border-white'}`}>
                        <div className="flex items-center gap-3">
                          <Clock size={16} className={alarmaSonando ? 'text-white' : 'text-indigo-500'} />
                          <div>
                            <p className={`text-[11px] font-black leading-tight ${alarmaSonando ? 'text-white' : 'text-gray-800'}`}>Dosis: {m.dosis}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${alarmaSonando ? 'text-red-100' : 'text-gray-500'}`}>
                              Cada {m.frecuencia}h • <span className={alarmaSonando ? 'text-white' : 'text-indigo-400'}>{m.esSiempre ? 'Continuo' : `${m.duracion} días`}</span>
                            </p>
                          </div>
                        </div>
                        {alarmaSonando && (
                          <button onClick={() => registrarToma(m.id)} className="bg-white text-red-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg active:scale-95 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={14}/> Tomé
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <AdSenseBanner adSlot="PON_TU_SLOT_AQUI_4" />
          </div>
        )}

        {/* TAB 3: COMPRAS */}
        {tabActivo === 'compras' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-1"><ShoppingCart size={14}/> Lista de Compras</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Añadir a la lista (Presiona Enter)..." className="flex-1 p-4 bg-white shadow-sm border border-gray-100 rounded-2xl outline-none font-bold text-gray-800 text-sm" 
                     onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { agregarACompras(e.target.value.trim()); e.target.value = ''; } }} />
            </div>
            {compras.length === 0 && (
              <div className="py-16 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Lista vacía</p>
              </div>
            )}
            <div className="space-y-2">
              {compras.sort((a,b) => a.comprado - b.comprado).map((c) => (
                <div key={c.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${c.comprado ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleCompra(c)}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>{c.comprado && <CheckCircle2 size={14} className="text-white"/>}</div>
                    <span className={`font-black text-sm ${c.comprado ? 'line-through text-gray-400' : 'text-gray-800'}`}>{c.nombre}</span>
                  </div>
                  <button onClick={() => borrarItemDirecto(c.id, 'compras')} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL PAPELERA INTELIGENTE */}
      {itemABorrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black italic text-gray-900 mb-2">¿Qué pasó con esto?</h3>
            <p className="text-gray-500 text-xs mb-6 leading-relaxed">Ayúdanos a llevar las estadísticas de ahorro de tu familia.</p>
            
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
              <h4 className="font-black text-lg text-gray-800">{itemABorrar.nombre}</h4>
            </div>

            <div className="flex flex-col gap-3">
              <button onClick={() => confirmarBorradoEstadistica('consumido')} className="w-full bg-green-100 text-green-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform hover:bg-green-200 border border-green-200">
                <ThumbsUp size={20}/> Lo consumimos / Usamos
              </button>
              <button onClick={() => confirmarBorradoEstadistica('basura')} className="w-full bg-red-100 text-red-700 font-black p-4 rounded-2xl flex justify-center items-center gap-2 active:scale-95 transition-transform hover:bg-red-200 border border-red-200">
                <AlertTriangle size={20}/> Se echó a perder / A la basura
              </button>
              
              <button onClick={() => setItemABorrar(null)} className="mt-4 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-600 p-2">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* BOTÓN FLOTANTE GENERAL (Oculto en tab compras) */}
      {tabActivo !== 'compras' && (
        <div className="fixed bottom-[80px] left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-30">
          <div className="pointer-events-auto flex justify-end">
            <button onClick={() => abrirFormulario(null, tabActivo === 'comida' ? 'alimento' : 'medicamento')} 
              className="w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-transform active:scale-95">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR (3 TABS) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-between px-4 py-2">
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Leaf size={22} className={tabActivo === 'comida' ? 'fill-blue-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Despensa</span>
          </button>
          <div className="w-px bg-gray-100 my-2"></div>
          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <Pill size={22} className={tabActivo === 'medicamentos' ? 'fill-indigo-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Botiquín</span>
          </button>
          <div className="w-px bg-gray-100 my-2"></div>
          <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'compras' ? 'text-green-600' : 'text-gray-400'}`}>
            <ShoppingCart size={22} className={tabActivo === 'compras' ? 'fill-green-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Compras</span>
          </button>
        </div>
      </nav>

      {/* MODAL QR DE INVITACIÓN */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarQRCompartir(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 text-center flex flex-col items-center">
            <button onClick={() => setMostrarQRCompartir(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={18}/></button>
            <h2 className="text-2xl font-black text-gray-900 italic mb-2">Invitar Familiar</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Que escaneen este código desde la pantalla inicial para entrar juntos al hogar.</p>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-50 mb-4 inline-block flex items-center justify-center min-h-[180px] min-w-[180px]">
              <img src={qrUrl} alt="QR Familiar" className="w-[180px] h-[180px]" />
            </div>
            <p className="text-blue-600 font-black text-xl uppercase tracking-widest mt-2">{usuarioActual.id}</p>
            <p className="text-gray-400 font-black tracking-[0.5em] text-xs mt-1">PIN: {usuarioActual.pin || '****'}</p>
          </div>
        </div>
      )}

      {/* FORMULARIO DINÁMICO */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-gray-900 italic">{editandoId ? 'Editar Elemento' : 'Añadir al Hogar'}</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={18}/></button>
            </div>
            
            {!editandoId && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'alimento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'alimento' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Comida</button>
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'medicamento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'medicamento' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Medicamento</button>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Tag size={12} /> Nombre</label>
                <input type="text" placeholder={nuevoItem.tipo === 'alimento' ? "Ej: Leche" : "Ej: Paracetamol"} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-lg transition-all" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              </div>

              {nuevoItem.tipo === 'alimento' ? (
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Calendar size={12} /> Vencimiento</label>
                  <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
                </div>
              ) : (
                <>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Calendar size={12} /> Vence (Opc)</label>
                      <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl outline-none font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Dosis</label>
                      <input type="text" placeholder="Ej: 1 pastilla" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-indigo-200 rounded-2xl outline-none font-bold text-gray-800 text-sm transition-all" value={nuevoItem.dosis} onChange={(e) => setNuevoItem({...nuevoItem, dosis: e.target.value})} />
                    </div>
                  </div>

                  <div className="animate-in fade-in bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-3 mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock size={16} className="text-indigo-500" />
                      <span className="text-[11px] font-black text-indigo-800 uppercase tracking-widest">Plan de Tratamiento</span>
                    </div>
                    
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Cada (Hrs)</label>
                        <select className="w-full p-3 bg-white border-2 border-transparent focus:border-indigo-200 rounded-xl outline-none font-bold text-gray-800 text-sm" value={nuevoItem.frecuencia} onChange={(e) => setNuevoItem({...nuevoItem, frecuencia: e.target.value})}>
                          <option value="Sin Alarma">Sin Alarma</option>
                          <option value="4">Cada 4 horas</option>
                          <option value="6">Cada 6 horas</option>
                          <option value="8">Cada 8 horas</option>
                          <option value="12">Cada 12 horas</option>
                          <option value="24">Cada 24 horas</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Hora Inicio</label>
                        <input type="time" disabled={nuevoItem.frecuencia === 'Sin Alarma'} className="w-full p-3 bg-white border-2 border-transparent focus:border-indigo-200 rounded-xl outline-none font-bold text-gray-800 text-sm disabled:opacity-50" value={nuevoItem.horaInicio} onChange={(e) => setNuevoItem({...nuevoItem, horaInicio: e.target.value})} />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 pt-1">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Duración (Días)</label>
                        <input type="number" disabled={nuevoItem.esSiempre || nuevoItem.frecuencia === 'Sin Alarma'} placeholder="Ej: 7" className="w-full p-3 bg-white border-2 border-transparent focus:border-indigo-200 rounded-xl outline-none font-bold text-gray-800 text-sm disabled:opacity-50" value={nuevoItem.duracion} onChange={(e) => setNuevoItem({...nuevoItem, duracion: e.target.value})} />
                      </div>
                      <label className="flex items-center gap-2 font-bold text-xs text-indigo-600 mt-4 cursor-pointer">
                        <input type="checkbox" disabled={nuevoItem.frecuencia === 'Sin Alarma'} className="w-4 h-4 accent-indigo-600 rounded" checked={nuevoItem.esSiempre} onChange={(e) => setNuevoItem({...nuevoItem, esSiempre: e.target.checked})} /> Siempre
                      </label>
                    </div>
                  </div>
                </>
              )}

              <button disabled={!nuevoItem.nombre || (nuevoItem.tipo === 'alimento' && !nuevoItem.fecha)} onClick={agregarOEditarItem} className={`w-full text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 active:scale-95 uppercase tracking-widest text-xs mt-4 transition-transform ${nuevoItem.tipo === 'alimento' ? 'bg-gray-900' : 'bg-indigo-600'}`}>
                {editandoId ? 'Guardar Cambios' : `Guardar en ${nuevoItem.tipo === 'alimento' ? 'Despensa' : 'Botiquín'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;