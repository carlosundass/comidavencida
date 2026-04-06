import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2, Edit2, ShoppingCart, CheckCircle2, ListPlus } from 'lucide-react';
import Scanner from './Scanner';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const Dashboard = () => {
  // ==========================================
  // 1. ESTADOS PRINCIPALES Y AUTENTICACIÓN
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

  // TABS INCLUYEN COMPRAS
  const [tabActivo, setTabActivo] = useState('comida');

  const [mostrarQRCompartir, setMostrarQRCompartir] = useState(false);
  const [mostrarScannerLogin, setMostrarScannerLogin] = useState(false);

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
        if (despensaSnap.exists()) {
          setErrorAuth('Ese nombre de despensa ya existe. Elige otro.');
        } else {
          await setDoc(despensaRef, { pin: inputPin, creadaEn: new Date() });
          iniciarSesion(idLimpio, inputPin);
        }
      } else {
        if (!despensaSnap.exists()) {
          setErrorAuth('No encontramos esta cuenta.');
        } else if (despensaSnap.data().pin !== inputPin) {
          setErrorAuth('El PIN es incorrecto.');
        } else {
          iniciarSesion(idLimpio, inputPin);
        }
      }
    } catch (error) {
      setErrorAuth('Error de conexión. Revisa tu internet.');
      console.error(error);
    } finally {
      setCargandoAuth(false);
    }
  };

  const iniciarSesion = (id, pin) => {
    const dataUsuario = { id, pin };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId('');
    setInputPin('');
    setTabActivo('comida');
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
    setProductos([]);
    setMedicamentos([]);
    setCompras([]);
    setVista('landing');
  };

  const procesarQRLogin = async (codigoQR) => {
    setMostrarScannerLogin(false);
    if (codigoQR.startsWith('CV-LOGIN|')) {
      const [, qrId, qrPin] = codigoQR.split('|');
      setCargandoAuth(true);
      setErrorAuth('');
      try {
        const despensaRef = doc(db, 'despensas', qrId);
        const despensaSnap = await getDoc(despensaRef);
        if (!despensaSnap.exists() || despensaSnap.data().pin !== qrPin) {
          setErrorAuth('El código QR es inválido o el PIN cambió.');
        } else {
          iniciarSesion(qrId, qrPin);
        }
      } catch(e) {
        setErrorAuth('Error al leer el QR. Revisa tu internet.');
      } finally {
        setCargandoAuth(false);
      }
    } else {
       setErrorAuth('Ese código QR no es una invitación de Comida Vencida.');
    }
  };

  // ==========================================
  // 2. LÓGICA DE DATOS (FIREBASE)
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [compras, setCompras] = useState([]); // Nuevo estado para Compras
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  
  // Estado para Edición
  const [editandoId, setEditandoId] = useState(null);

  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento',
    nombre: '', 
    codigo: '', 
    fecha: '',
    dosis: '',
    frecuencia: 'Sin Alarma'
  });

  useEffect(() => {
    if (usuarioActual) {
      const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
      const unSubItems = onSnapshot(itemsRef, (snapshot) => {
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const medsRef = collection(db, 'despensas', usuarioActual.id, 'medicamentos');
      const unSubMeds = onSnapshot(medsRef, (snapshot) => {
        setMedicamentos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const comprasRef = collection(db, 'despensas', usuarioActual.id, 'compras');
      const unSubCompras = onSnapshot(comprasRef, (snapshot) => {
        setCompras(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => { unSubItems(); unSubMeds(); unSubCompras(); };
    }
  }, [usuarioActual]);

  const abrirFormularioNuevo = (tipo) => {
    setEditandoId(null);
    setNuevoItem({ tipo, nombre: '', codigo: '', fecha: '', dosis: '', frecuencia: 'Sin Alarma' });
    setMostrarForm(true);
  };

  const abrirEdicion = (item, tipo) => {
    setEditandoId(item.id);
    setNuevoItem({ 
      tipo, 
      nombre: item.nombre || '', 
      codigo: item.codigo || '', 
      fecha: item.fecha || '', 
      dosis: item.dosis || '', 
      frecuencia: item.frecuencia || 'Sin Alarma' 
    });
    setMostrarForm(true);
  };

  const agregarOEditarItem = async () => {
    if (!nuevoItem.nombre) return;
    
    const coleccionDestino = nuevoItem.tipo === 'alimento' ? 'items' : 'medicamentos';
    const datos = {
      nombre: nuevoItem.nombre,
      codigo: nuevoItem.codigo || '',
      fecha: nuevoItem.fecha || '',
    };

    if (nuevoItem.tipo === 'medicamento') {
      datos.dosis = nuevoItem.dosis || '';
      datos.frecuencia = nuevoItem.frecuencia;
      // Solo seteamos ultimaToma al crear uno nuevo, no al editar (para no reiniciar la alarma sin querer)
      if (!editandoId) datos.ultimaToma = new Date().getTime(); 
    }

    if (editandoId) {
      const docRef = doc(db, 'despensas', usuarioActual.id, coleccionDestino, editandoId);
      await updateDoc(docRef, datos);
    } else {
      datos.creadoEn = new Date().getTime();
      await addDoc(collection(db, 'despensas', usuarioActual.id, coleccionDestino), datos);
    }
    
    setMostrarForm(false);
  };

  const borrarItem = async (itemId, coleccion) => {
    const docRef = doc(db, 'despensas', usuarioActual.id, coleccion, itemId);
    await deleteDoc(docRef);
  };

  // LOGICA LISTA DE COMPRAS
  const agregarACompras = async (nombreProducto) => {
    await addDoc(collection(db, 'despensas', usuarioActual.id, 'compras'), {
      nombre: nombreProducto,
      comprado: false,
      creadoEn: new Date().getTime()
    });
  };

  const toggleCompra = async (item) => {
    const docRef = doc(db, 'despensas', usuarioActual.id, 'compras', item.id);
    await updateDoc(docRef, { comprado: !item.comprado });
  };

  // LOGICA ALARMAS MEDICAMENTOS
  const registrarToma = async (idMedicamento) => {
    const docRef = doc(db, 'despensas', usuarioActual.id, 'medicamentos', idMedicamento);
    await updateDoc(docRef, { ultimaToma: new Date().getTime() });
  };

  const verificarAlarma = (med) => {
    if (!med.frecuencia || med.frecuencia === 'Sin Alarma') return false;
    const horasFrecuencia = parseInt(med.frecuencia.replace(/\D/g, '')) || 0; // Extrae "8", "12", "24"
    if (horasFrecuencia === 0) return false;

    const ultima = med.ultimaToma || med.creadoEn;
    const horasPasadas = (new Date().getTime() - ultima) / (1000 * 60 * 60);
    
    return horasPasadas >= horasFrecuencia; // Retorna true si ya pasó el tiempo
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // ==========================================
  // RENDER PANTALLAS LEGALES Y LANDING
  // ==========================================
  if (!usuarioActual && vista === 'privacidad') return <div className="p-6">Política</div>;
  if (!usuarioActual && vista === 'terminos') return <div className="p-6">Términos</div>;
  if (!usuarioActual && vista === 'contacto') return <div className="p-6">Contacto</div>;

  if (!usuarioActual && vista === 'landing') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        <header className="p-6 bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-gray-900">comidavencida</h1>
          <button onClick={() => { setVista('login'); setModoLogin('entrar'); }} className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">Entrar</button>
        </header>
        <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <div className="text-center mt-8 mb-10">
            <div className="inline-block bg-green-100 text-green-700 font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest mb-4 shadow-sm">100% Gratuita para siempre</div>
            <h2 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-4">Evita el desperdicio y <span className="text-blue-600">ahorra dinero</span>.</h2>
            <p className="text-gray-600 font-medium text-lg leading-relaxed">La herramienta sin costo para organizar tu refrigerador, tu botiquín y tu lista de compras.</p>
          </div>
          <div className="space-y-4 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-full h-fit"><DollarSign size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 mb-1">Ahorro Inteligente</h3>
                <p className="text-gray-500 text-sm">Organiza tu despensa para no comprar productos duplicados.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-indigo-100 text-indigo-600 p-3 rounded-full h-fit"><Pill size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 mb-1">Control de Botiquín</h3>
                <p className="text-gray-500 text-sm">Registra tus medicamentos, evita consumirlos vencidos y configura alarmas de tomas.</p>
              </div>
            </div>
          </div>
          <button onClick={() => { setVista('login'); setModoLogin('crear'); }} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm flex justify-center items-center gap-2 mb-10 transition-transform">Crear cuenta Gratis <ArrowRight size={18} /></button>
        </main>
        <footer className="bg-gray-100 p-6 text-center text-xs text-gray-400 font-medium mt-auto">
          <p className="mb-4">© 2026 Comida Vencida App. Todos los derechos reservados.</p>
        </footer>
      </div>
    );
  }

  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">← Volver</button>
        <div className="w-full max-w-sm mt-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 italic">comidavencida</h1>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border border-gray-100">
            <div className="flex bg-gray-50 rounded-2xl p-1 mb-8">
              <button onClick={() => { setModoLogin('crear'); setErrorAuth(''); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'crear' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Crear Nueva</button>
              <button onClick={() => { setModoLogin('entrar'); setErrorAuth(''); }} className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${modoLogin === 'entrar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Ingresar</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Home size={12} /> Nombre de Despensa</label>
                <input type="text" placeholder="Ej: FamiliaRojas" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 transition-all" value={inputId} onChange={(e) => setInputId(e.target.value.replace(/\s+/g, ''))} />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Lock size={12} /> PIN (4 números)</label>
                <input type="password" inputMode="numeric" maxLength={4} placeholder="****" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-black text-2xl text-center tracking-[0.5em] text-gray-800 transition-all" value={inputPin} onChange={(e) => setInputPin(e.target.value.replace(/\D/g, ''))} />
              </div>
              {errorAuth && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold text-center border border-red-100 animate-in fade-in">{errorAuth}</div>}
              <button disabled={cargandoAuth} onClick={manejarAcceso} className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm mt-4 disabled:opacity-50 transition-transform">
                {cargandoAuth ? 'Conectando...' : (modoLogin === 'crear' ? 'Abrir mi Despensa 🚀' : 'Entrar ✅')}
              </button>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">O entrar con invitación</p>
              <button onClick={() => setMostrarScannerLogin(true)} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 font-black p-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all">
                <QrCode size={20} /> Escanear QR Familiar
              </button>
            </div>
          </div>
        </div>
        {mostrarScannerLogin && <Scanner onScan={procesarQRLogin} onClose={() => setMostrarScannerLogin(false)} />}
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA 3: DASHBOARD PRINCIPAL
  // ==========================================
  const qrData = `CV-LOGIN|${usuarioActual?.id || 'error'}|${usuarioActual?.pin || '0000'}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrData)}`;

  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center sticky top-0 bg-[#F8F9FB] z-20">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none italic">comidavencida</h1>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Home size={12} className="text-blue-600" />
            <p className="font-bold text-[10px] uppercase tracking-widest text-gray-800">{usuarioActual.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"><Share2 size={18} /></button>
          <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 px-6 mt-2">
        {/* TAB 1: COMIDA */}
        {tabActivo === 'comida' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo de Alimentos</h2>
            {productos.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Todo al día</p>
                <p className="text-gray-400 text-sm mt-1">Tu despensa está vacía ☁️</p>
              </div>
            )}
            <div className="space-y-3">
              {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
                const dias = calcularDias(p.fecha);
                const est = obtenerEstado(dias);
                return (
                  <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between shadow-sm ${est.bg} ${est.border}`}>
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px]">{est.icono}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                      </div>
                      <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.nombre}</h3>
                      <div className="flex flex-col mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                        {p.codigo && <p className="text-[9px] font-semibold text-gray-400 uppercase mt-0.5"><ScanBarcode size={10} className="inline mr-1"/>{p.codigo}</p>}
                      </div>
                    </div>
                    {/* Botones Acciones Comida */}
                    <div className="flex items-center gap-1.5 pl-3 border-l border-black/10">
                      <div className="text-center min-w-[3rem] mr-2">
                        <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-50`}>días</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button onClick={() => abrirEdicion(p, 'alimento')} className="text-gray-400 hover:text-blue-500 p-1 bg-white rounded-full shadow-sm"><Edit2 size={14} /></button>
                        <button onClick={() => agregarACompras(p.nombre)} className="text-gray-400 hover:text-green-500 p-1 bg-white rounded-full shadow-sm" title="Añadir a Compras"><ShoppingCart size={14} /></button>
                        <button onClick={() => borrarItem(p.id, 'items')} className="text-gray-400 hover:text-red-500 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: MEDICAMENTOS */}
        {tabActivo === 'medicamentos' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Botiquín</h2>
            {medicamentos.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Botiquín vacío</p>
                <p className="text-gray-400 text-sm mt-1">Añade medicamentos y alarmas 💊</p>
              </div>
            )}
            <div className="space-y-3">
              {medicamentos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((m) => {
                const dias = calcularDias(m.fecha);
                const est = obtenerEstado(dias);
                const alarmaActivada = verificarAlarma(m);

                return (
                  <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 flex flex-col justify-between shadow-sm transition-all ${alarmaActivada ? 'bg-red-50 border-red-300 shadow-red-100' : est.bg + ' ' + est.border}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px]">{est.icono}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                        </div>
                        <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{m.nombre}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {m.fecha.split('-').reverse().join('/')}</p>
                      </div>
                      <div className="flex gap-1.5">
                         <button onClick={() => abrirEdicion(m, 'medicamento')} className="text-gray-400 hover:text-blue-500 p-1.5 bg-white rounded-full shadow-sm h-fit"><Edit2 size={16} /></button>
                         <button onClick={() => borrarItem(m.id, 'medicamentos')} className="text-gray-400 hover:text-red-500 p-1.5 bg-white rounded-full shadow-sm h-fit"><Trash2 size={16} /></button>
                      </div>
                    </div>

                    {/* Lógica Visual de Alarma */}
                    {m.frecuencia !== 'Sin Alarma' && (
                      <div className={`p-3 rounded-xl border flex items-center justify-between ${alarmaActivada ? 'bg-red-500 border-red-600 text-white' : 'bg-white/50 border-white/60'}`}>
                        <div className="flex items-center gap-3">
                          <Clock size={16} className={alarmaActivada ? 'text-white' : est.text} />
                          <div>
                            <p className={`text-[11px] font-black leading-tight ${alarmaActivada ? 'text-white' : 'text-gray-800'}`}>Dosis: {m.dosis || '1'}</p>
                            <p className={`text-[9px] font-bold uppercase tracking-widest ${alarmaActivada ? 'text-red-100' : 'text-gray-500'}`}>{m.frecuencia}</p>
                          </div>
                        </div>
                        {alarmaActivada && (
                          <button onClick={() => registrarToma(m.id)} className="bg-white text-red-600 font-black text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg shadow-sm active:scale-95 flex items-center gap-1">
                            <CheckCircle2 size={14}/> Tomar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: COMPRAS */}
        {tabActivo === 'compras' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1 flex items-center gap-2"><ShoppingCart size={14}/> Lista de Compras</h2>
            
            {/* Input rápido para compras */}
            <div className="flex gap-2 mb-4">
              <input type="text" placeholder="Añadir a la lista..." className="flex-1 p-4 bg-white shadow-sm border border-gray-100 rounded-2xl outline-none font-bold text-gray-800 text-sm" 
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && e.target.value.trim()) {
                         agregarACompras(e.target.value.trim());
                         e.target.value = '';
                       }
                     }} />
            </div>

            {compras.length === 0 && (
              <div className="py-16 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Lista vacía</p>
                <p className="text-gray-400 text-sm mt-1">Añade productos cuando se acaben.</p>
              </div>
            )}
            <div className="space-y-2">
              {compras.sort((a,b) => a.comprado - b.comprado).map((c) => (
                <div key={c.id} className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${c.comprado ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
                  <div className="flex items-center gap-3 flex-1" onClick={() => toggleCompra(c)}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.comprado ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {c.comprado && <CheckCircle2 size={14} className="text-white"/>}
                    </div>
                    <span className={`font-black text-sm ${c.comprado ? 'line-through text-gray-400' : 'text-gray-800'}`}>{c.nombre}</span>
                  </div>
                  <button onClick={() => borrarItem(c.id, 'compras')} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ÁREA DE PUBLICIDAD */}
        <div className="mt-8 mb-10 flex justify-center w-full">
          <div className="w-[320px] h-[50px] bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
            <ins className="adsbygoogle" style={{ display: 'inline-block', width: '320px', height: '50px' }} data-ad-client="ca-pub-3386079946838939" data-ad-slot="TU_SLOT_AQUI"></ins>
          </div>
        </div>
      </main>

      {/* BOTONES FLOTANTES (Solo en Comida y Meds) */}
      {tabActivo !== 'compras' && (
        <div className="fixed bottom-[80px] left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-30">
          <div className="pointer-events-auto">
            <button onClick={() => abrirFormularioNuevo(tabActivo === 'comida' ? 'alimento' : 'medicamento')} className="mx-auto w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          <div className="pointer-events-auto">
            <button onClick={() => {
                setEditandoId(null);
                setNuevoItem({ tipo: tabActivo === 'comida' ? 'alimento' : 'medicamento', nombre: '', codigo: '', fecha: '', dosis: '', frecuencia: 'Sin Alarma' });
                setMostrarScanner(true);
              }} 
              className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all">
              <ScanBarcode size={24} /> Escanear Código
            </button>
          </div>
        </div>
      )}

      {/* NAVEGACIÓN INFERIOR (3 TABS) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-between px-4 py-2">
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Leaf size={22} className={tabActivo === 'comida' ? 'fill-blue-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Despensa</span>
          </button>
          <div className="w-px bg-gray-100 my-2"></div>
          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <Pill size={22} className={tabActivo === 'medicamentos' ? 'fill-indigo-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Botiquín</span>
          </button>
          <div className="w-px bg-gray-100 my-2"></div>
          <button onClick={() => setTabActivo('compras')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'compras' ? 'text-green-600' : 'text-gray-400'}`}>
            <ShoppingCart size={22} className={tabActivo === 'compras' ? 'fill-green-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Compras</span>
          </button>
        </div>
      </nav>

      {/* MODAL QR */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarQRCompartir(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 text-center flex flex-col items-center">
            <button onClick={() => setMostrarQRCompartir(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500"><X size={18}/></button>
            <h2 className="text-2xl font-black text-gray-900 italic mb-2">Invitar Familiar</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Que escaneen este código desde la pantalla inicial.</p>
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-50 mb-4 flex items-center justify-center min-h-[180px] min-w-[180px]">
              <img src={qrUrl} alt="QR Familiar" className="w-[180px] h-[180px]" />
            </div>
            <p className="text-blue-600 font-black text-xl uppercase tracking-widest mt-2">{usuarioActual.id}</p>
            <p className="text-gray-400 font-black tracking-[0.5em] text-xs mt-1">PIN: {usuarioActual.pin || '****'}</p>
          </div>
        </div>
      )}

      {/* FORMULARIO DINÁMICO (CREAR O EDITAR) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-gray-900 italic">{editandoId ? 'Editar Elemento' : 'Añadir al Hogar'}</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={18}/></button>
            </div>
            
            {/* Solo muestra selector de categoría si estamos creando uno nuevo */}
            {!editandoId && (
              <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'alimento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'alimento' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Comida</button>
                <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'medicamento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'medicamento' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Medicamento</button>
              </div>
            )}

            <div className="space-y-4 mt-2">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Tag size={12} /> Nombre</label>
                <input type="text" placeholder={nuevoItem.tipo === 'alimento' ? "Ej: Leche" : "Ej: Paracetamol"} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-lg transition-all" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              </div>

              {nuevoItem.tipo === 'alimento' ? (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><ScanBarcode size={12} /> Código (Opc)</label>
                    <input type="text" placeholder="Ej: 780..." className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 transition-all" value={nuevoItem.codigo} onChange={(e) => setNuevoItem({...nuevoItem, codigo: e.target.value})} />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Calendar size={12} /> Vencimiento</label>
                    <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Calendar size={12} /> Vencimiento Botiquín (Opc)</label>
                    <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoItem.fecha} onChange={(e) => setNuevoItem({...nuevoItem, fecha: e.target.value})} />
                  </div>
                  <div className="animate-in fade-in bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={16} className="text-indigo-500" />
                      <span className="text-[11px] font-black text-indigo-800 uppercase tracking-widest">Alarma de Toma</span>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Dosis (Opc)</label>
                        <input type="text" placeholder="Ej: 1 pastilla" className="w-full p-3 bg-white border-2 border-transparent focus:border-indigo-200 rounded-xl outline-none font-bold text-gray-800 text-sm" value={nuevoItem.dosis} onChange={(e) => setNuevoItem({...nuevoItem, dosis: e.target.value})} />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-2 mb-1 block">Frecuencia</label>
                        <select className="w-full p-3 bg-white border-2 border-transparent focus:border-indigo-200 rounded-xl outline-none font-bold text-gray-800 text-sm" value={nuevoItem.frecuencia} onChange={(e) => setNuevoItem({...nuevoItem, frecuencia: e.target.value})}>
                          <option value="Sin Alarma">Sin Alarma</option>
                          <option value="Cada 8 horas">Cada 8 horas</option>
                          <option value="Cada 12 horas">Cada 12 horas</option>
                          <option value="Cada 24 horas">Cada 24 horas</option>
                        </select>
                      </div>
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

      {/* Escáner */}
      {mostrarScanner && (
        <Scanner onScan={(codigoDetectado) => {
            setNuevoItem({ ...nuevoItem, codigo: codigoDetectado, fecha: '' });
            setMostrarScanner(false);
            setMostrarForm(true);
          }} onClose={() => setMostrarScanner(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;