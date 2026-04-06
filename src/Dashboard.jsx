import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, Pill, Clock, QrCode, Share2 } from 'lucide-react';
import Scanner from './Scanner';
import QRCode from 'react-qr-code';
// IMPORTACIONES DE FIREBASE
import { db } from './firebase';
import { collection, doc, setDoc, getDoc, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

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

  const [tabActivo, setTabActivo] = useState('comida');

  // ESTADOS PARA EL QR
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
    const dataUsuario = { id, pin }; // Guardamos el PIN para armar el QR luego
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
    setVista('landing');
  };

  // LOGICA PARA LEER EL QR DE INVITACIÓN
  const procesarQRLogin = async (codigoQR) => {
    setMostrarScannerLogin(false);
    // Formato que generaremos: CV-LOGIN|idDeFamilia|1234
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
          iniciarSesion(qrId, qrPin); // ¡Entra directo!
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
  
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  
  const [nuevoItem, setNuevoItem] = useState({ 
    tipo: 'alimento',
    nombre: '', 
    codigo: '', 
    fecha: '',
    dosis: '',
    frecuencia: 'Cada 8 horas'
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

      return () => { unSubItems(); unSubMeds(); };
    }
  }, [usuarioActual]);

  const agregarItem = async () => {
    if (!nuevoItem.nombre || !nuevoItem.fecha) return;
    
    if (nuevoItem.tipo === 'alimento') {
      await addDoc(collection(db, 'despensas', usuarioActual.id, 'items'), {
        nombre: nuevoItem.nombre,
        codigo: nuevoItem.codigo || '',
        fecha: nuevoItem.fecha,
        creadoEn: new Date().getTime()
      });
    } else {
      await addDoc(collection(db, 'despensas', usuarioActual.id, 'medicamentos'), {
        nombre: nuevoItem.nombre,
        codigo: nuevoItem.codigo || '',
        fecha: nuevoItem.fecha,
        dosis: nuevoItem.dosis || '',
        frecuencia: nuevoItem.frecuencia,
        creadoEn: new Date().getTime()
      });
    }
    
    setNuevoItem({ tipo: tabActivo === 'comida' ? 'alimento' : 'medicamento', nombre: '', codigo: '', fecha: '', dosis: '', frecuencia: 'Cada 8 horas' });
    setMostrarForm(false);
  };

  const borrarItem = async (itemId, coleccion) => {
    const docRef = doc(db, 'despensas', usuarioActual.id, coleccion, itemId);
    await deleteDoc(docRef);
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // ==========================================
  // RENDER PANTALLAS LEGALES Y DE CONTACTO
  // ==========================================
  
  if (!usuarioActual && vista === 'privacidad') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative px-6 py-12">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">← Volver</button>
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2rem] shadow-xl mt-8">
          <h1 className="text-2xl font-black mb-6 text-gray-900">Política de Privacidad</h1>
          <div className="text-gray-600 space-y-4 text-sm leading-relaxed">
            <p><strong>Última actualización: Abril 2026</strong></p>
            <p>En Comida Vencida App, nos tomamos muy en serio tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos tu información.</p>
            <h3 className="font-bold text-gray-900">1. Información que recopilamos</h3>
            <p>No recopilamos información personal identificable como nombres reales, correos electrónicos o números de teléfono. Solo almacenamos el "Nombre de Despensa" y el "PIN" que tú mismo creas para acceder a tu cuenta, además de los datos de los alimentos que ingresas.</p>
            <h3 className="font-bold text-gray-900">2. Publicidad (Google AdSense)</h3>
            <p>Utilizamos Google AdSense para mostrar anuncios. Google utiliza cookies para publicar anuncios basados en tus visitas anteriores a nuestra aplicación u otros sitios web de Internet. Puedes inhabilitar la publicidad personalizada visitando la Configuración de anuncios de Google.</p>
            <h3 className="font-bold text-gray-900">3. Almacenamiento de Datos</h3>
            <p>Tus datos de inventario se almacenan de forma segura utilizando los servicios en la nube de Google (Firebase). No vendemos ni compartimos tus datos de inventario con terceros.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usuarioActual && vista === 'terminos') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative px-6 py-12">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">← Volver</button>
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-[2rem] shadow-xl mt-8">
          <h1 className="text-2xl font-black mb-6 text-gray-900">Términos y Condiciones</h1>
          <div className="text-gray-600 space-y-4 text-sm leading-relaxed">
            <h3 className="font-bold text-gray-900">1. Servicio 100% Gratuito</h3>
            <p>Comida Vencida App se ofrece de manera completamente gratuita para todos los usuarios. No existen cargos ocultos, versiones premium ni suscripciones. La plataforma se mantiene operativa gracias a la publicidad mostrada en pantalla.</p>
            <h3 className="font-bold text-gray-900">2. Aceptación de los Términos</h3>
            <p>Al acceder y utilizar Comida Vencida App, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo, por favor no utilices la aplicación.</p>
            <h3 className="font-bold text-gray-900">3. Uso de la Aplicación</h3>
            <p>Comida Vencida es una herramienta de organización personal. Eres responsable de mantener la confidencialidad de tu ID de Despensa y PIN.</p>
            <h3 className="font-bold text-gray-900">4. Limitación de Responsabilidad</h3>
            <p>Esta aplicación proporciona cálculos estimativos de fechas de vencimiento. No nos hacemos responsables por alimentos consumidos en mal estado, intoxicaciones, pérdidas económicas o cualquier problema derivado de la información ingresada por el usuario. La revisión del estado real del alimento es responsabilidad exclusiva del usuario.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usuarioActual && vista === 'contacto') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative px-6 py-12">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">← Volver</button>
        <div className="max-w-md mx-auto w-full mt-10">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl text-center border border-gray-100">
            <h1 className="text-3xl font-black mb-4 text-gray-900 italic">Contacto</h1>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">¿Tienes dudas, sugerencias o encontraste algún error en la aplicación? ¡Nos encantaría escucharte!</p>
            <a href="mailto:hola@comidavencida.cl" className="inline-block w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm transition-transform">
              Enviar un correo
            </a>
            <p className="mt-6 text-xs text-gray-400">Responderemos lo antes posible.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA 1: PORTADA SEO (LANDING PAGE)
  // ==========================================
  if (!usuarioActual && vista === 'landing') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col">
        {/* Cabecera Publica */}
        <header className="p-6 bg-white shadow-sm flex justify-between items-center">
          <h1 className="text-2xl font-black italic text-gray-900">comidavencida</h1>
          <button 
            onClick={() => { setVista('login'); setModoLogin('entrar'); }} 
            className="text-blue-600 font-bold text-[11px] uppercase tracking-wider bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors"
          >
            Entrar
          </button>
        </header>

        {/* Contenido SEO para el robot de Google */}
        <main className="flex-1 p-6 max-w-2xl mx-auto w-full">
          <div className="text-center mt-8 mb-10">
            <div className="inline-block bg-green-100 text-green-700 font-black px-4 py-1.5 rounded-full text-[10px] uppercase tracking-widest mb-4 shadow-sm">
              100% Gratuita para siempre
            </div>
            <h2 className="text-4xl font-black tracking-tight text-gray-900 leading-tight mb-4">
              Evita el desperdicio y <span className="text-blue-600">ahorra dinero</span> en tus compras.
            </h2>
            <p className="text-gray-600 font-medium text-lg leading-relaxed">
              La herramienta sin costo para organizar tu refrigerador y despensa. Recibe alertas visuales antes de que tus alimentos expiren.
            </p>
          </div>

          {/* Tarjetas de valor (Texto para AdSense) */}
          <div className="space-y-4 mb-10">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-green-100 text-green-600 p-3 rounded-full h-fit"><DollarSign size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 mb-1">Ahorro Inteligente</h3>
                <p className="text-gray-500 text-sm">Organizar tu despensa evita comprar productos duplicados y reduce drásticamente el dinero que gastas en alimentos que terminan en la basura. Ideal para las familias en Chile.</p>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full h-fit"><Leaf size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 mb-1">Impacto Ambiental</h3>
                <p className="text-gray-500 text-sm">El desperdicio de comida es uno de los mayores problemas ecológicos. Al controlar las fechas de caducidad, contribuyes a un planeta más limpio y sostenible.</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-4">
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full h-fit"><ShieldCheck size={24} /></div>
              <div>
                <h3 className="font-black text-gray-900 mb-1">Privacidad Total</h3>
                <p className="text-gray-500 text-sm">No necesitas correo ni número de teléfono. Crea una sala privada con un PIN seguro y compártela solo con tu familia para actualizar las compras en tiempo real.</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => { setVista('login'); setModoLogin('crear'); }} 
            className="w-full bg-blue-600 text-white font-black p-5 rounded-2xl shadow-xl shadow-blue-200 active:scale-95 uppercase tracking-widest text-sm flex justify-center items-center gap-2 mb-10 transition-transform"
          >
            Crear despensa Gratis <ArrowRight size={18} />
          </button>
        </main>

        {/* Footer legal interactivo (Requisito AdSense) */}
        <footer className="bg-gray-100 p-6 text-center text-xs text-gray-400 font-medium mt-auto">
          <p className="mb-4">© 2026 Comida Vencida App. Todos los derechos reservados.</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <button onClick={() => setVista('privacidad')} className="hover:text-gray-600 hover:underline transition-colors">Política de Privacidad</button>
            <button onClick={() => setVista('terminos')} className="hover:text-gray-600 hover:underline transition-colors">Términos del Servicio</button>
            <button onClick={() => setVista('contacto')} className="hover:text-gray-600 hover:underline transition-colors">Contacto</button>
          </div>
        </footer>
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA 2: LOGIN CON QR
  // ==========================================
  if (!usuarioActual && vista === 'login') {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center items-center px-6 relative">
        <button onClick={() => setVista('landing')} className="absolute top-6 left-6 text-gray-400 font-black text-xs uppercase tracking-widest flex items-center gap-1 hover:text-gray-600 transition-colors">
          ← Volver
        </button>

        <div className="w-full max-w-sm mt-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 italic">comidavencida</h1>
            <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-2">Acceso a Despensa</p>
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

            {/* SECCIÓN DEL ESCÁNER PARA INVITADOS (QR) */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">O entrar con invitación</p>
              <button onClick={() => setMostrarScannerLogin(true)} className="w-full bg-white border-2 border-dashed border-gray-300 text-gray-600 font-black p-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-gray-50 active:scale-95 transition-all">
                <QrCode size={20} /> Escanear QR Familiar
              </button>
            </div>

          </div>
        </div>

        {/* Modal de Escáner en el Login */}
        {mostrarScannerLogin && (
          <Scanner onScan={procesarQRLogin} onClose={() => setMostrarScannerLogin(false)} />
        )}
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA 3: DASHBOARD PRINCIPAL
  // ==========================================
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
          {/* BOTÓN PARA COMPARTIR QR */}
          <button onClick={() => setMostrarQRCompartir(true)} className="bg-white border border-gray-200 p-2.5 rounded-full text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95">
            <Share2 size={18} />
          </button>
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
                    <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                      <div className="text-center min-w-[3rem]">
                        <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-50`}>días</span>
                      </div>
                      <button onClick={() => borrarItem(p.id, 'items')} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
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
                return (
                  <div key={m.id} className={`p-5 rounded-[1.5rem] border-2 flex flex-col justify-between shadow-sm ${est.bg} ${est.border}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px]">{est.icono}</span>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                        </div>
                        <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{m.nombre}</h3>
                        <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Vence: {m.fecha.split('-').reverse().join('/')}</p>
                      </div>
                      <button onClick={() => borrarItem(m.id, 'medicamentos')} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={20} /></button>
                    </div>
                    {m.dosis && (
                      <div className="bg-white/50 p-3 rounded-xl border border-white/60 flex items-center gap-3">
                        <Clock size={16} className={est.text} />
                        <div>
                          <p className="text-[11px] font-black text-gray-800 leading-tight">Tomar: {m.dosis}</p>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{m.frecuencia}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* BOTONES FLOTANTES GENERALES */}
      <div className="fixed bottom-[80px] left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-30">
        <div className="pointer-events-auto">
          <button onClick={() => {
              setNuevoItem({...nuevoItem, tipo: tabActivo === 'comida' ? 'alimento' : 'medicamento'});
              setMostrarForm(true);
            }} 
            className="mx-auto w-12 h-12 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
        <div className="pointer-events-auto">
          <button onClick={() => {
              setNuevoItem({...nuevoItem, tipo: tabActivo === 'comida' ? 'alimento' : 'medicamento'});
              setMostrarScanner(true);
            }} 
            className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all">
            <ScanBarcode size={24} /> Escanear Código
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN INFERIOR (TABS) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-between px-6 py-2">
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400'}`}>
            <Leaf size={22} className={tabActivo === 'comida' ? 'fill-blue-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Comida</span>
          </button>
          <div className="w-px bg-gray-100 my-2"></div>
          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 transition-colors flex-1 ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400'}`}>
            <Pill size={22} className={tabActivo === 'medicamentos' ? 'fill-indigo-100' : ''} />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-wider">Botiquín</span>
          </button>
        </div>
      </nav>

      {/* =========================================
          MODAL: COMPARTIR CÓDIGO QR
          ========================================= */}
      {mostrarQRCompartir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMostrarQRCompartir(false)}></div>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-300 text-center flex flex-col items-center">
            <button onClick={() => setMostrarQRCompartir(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={18}/></button>
            <h2 className="text-2xl font-black text-gray-900 italic mb-2">Invitar Familiar</h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">Que escaneen este código desde la pantalla inicial para entrar juntos a la despensa.</p>
            
            <div className="bg-white p-4 rounded-3xl shadow-sm border-4 border-gray-50 mb-4 inline-block">
              {/* Formato de la data: CV-LOGIN|id|pin */}
              <QRCode value={`CV-LOGIN|${usuarioActual.id}|${usuarioActual.pin}`} size={180} />
            </div>
            
            <p className="text-blue-600 font-black text-xl uppercase tracking-widest mt-2">{usuarioActual.id}</p>
            <p className="text-gray-400 font-black tracking-[0.5em] text-xs mt-1">PIN: {usuarioActual.pin || '****'}</p>
          </div>
        </div>
      )}

      {/* FORMULARIO DINÁMICO (COMIDA O MEDICAMENTO) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black text-gray-900 italic">Añadir al Hogar</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={18}/></button>
            </div>
            
            {/* SELECTOR DE CATEGORÍA */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'alimento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'alimento' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>Comida</button>
              <button onClick={() => setNuevoItem({...nuevoItem, tipo: 'medicamento'})} className={`flex-1 py-2 text-[11px] uppercase tracking-widest font-black rounded-lg transition-all ${nuevoItem.tipo === 'medicamento' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400'}`}>Medicamento</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1"><Tag size={12} /> Nombre</label>
                <input type="text" placeholder={nuevoItem.tipo === 'alimento' ? "Ej: Leche" : "Ej: Paracetamol"} className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-lg transition-all" value={nuevoItem.nombre} onChange={(e) => setNuevoItem({...nuevoItem, nombre: e.target.value})} />
              </div>

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

              {nuevoItem.tipo === 'medicamento' && (
                <div className="animate-in fade-in bg-indigo-50 p-4 rounded-2xl border border-indigo-100 space-y-4 mt-2">
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
              )}

              <button disabled={!nuevoItem.nombre || !nuevoItem.fecha} onClick={agregarItem} className={`w-full text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 active:scale-95 uppercase tracking-widest text-xs mt-4 transition-transform ${nuevoItem.tipo === 'alimento' ? 'bg-gray-900' : 'bg-indigo-600'}`}>
                Guardar en {nuevoItem.tipo === 'alimento' ? 'Despensa' : 'Botiquín'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escáner para Ingresar Productos */}
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