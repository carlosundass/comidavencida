import React, { useState, useEffect } from 'react';
import { Trash2, X, ScanBarcode, Plus, LogOut, Lock, Home, ArrowRight, ShieldCheck, Leaf, DollarSign, Calendar, Tag, PawPrint, Pill } from 'lucide-react';
import Scanner from './Scanner';
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

  // NUEVO: ESTADO PARA EL MENÚ INFERIOR
  const [tabActivo, setTabActivo] = useState('comida');

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
          iniciarSesion(idLimpio);
        }
      } else {
        if (!despensaSnap.exists()) {
          setErrorAuth('No encontramos esta despensa.');
        } else if (despensaSnap.data().pin !== inputPin) {
          setErrorAuth('El PIN es incorrecto.');
        } else {
          iniciarSesion(idLimpio);
        }
      }
    } catch (error) {
      setErrorAuth('Error de conexión. Revisa tu internet.');
      console.error(error);
    } finally {
      setCargandoAuth(false);
    }
  };

  const iniciarSesion = (id) => {
    const dataUsuario = { id };
    setUsuarioActual(dataUsuario);
    localStorage.setItem('cv_usuario_activo', JSON.stringify(dataUsuario));
    setInputId('');
    setInputPin('');
    setTabActivo('comida'); // Al iniciar sesión, va a la pestaña Comida
  };

  const cerrarSesion = () => {
    setUsuarioActual(null);
    localStorage.removeItem('cv_usuario_activo');
    setProductos([]);
    setVista('landing');
  };

  // ==========================================
  // 2. LÓGICA DE LA DESPENSA (COMIDA)
  // ==========================================
  const [productos, setProductos] = useState([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mostrarScanner, setMostrarScanner] = useState(false);
  const [nuevoProd, setNuevoProd] = useState({ nombre: '', codigo: '', fecha: '' });

  useEffect(() => {
    if (usuarioActual) {
      const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
      const unsubscribe = onSnapshot(itemsRef, (snapshot) => {
        const datosMagicos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProductos(datosMagicos);
      });
      return () => unsubscribe();
    }
  }, [usuarioActual]);

  const agregarItem = async () => {
    if (!nuevoProd.nombre || !nuevoProd.fecha) return;
    const itemsRef = collection(db, 'despensas', usuarioActual.id, 'items');
    await addDoc(itemsRef, {
      nombre: nuevoProd.nombre,
      codigo: nuevoProd.codigo || '',
      fecha: nuevoProd.fecha,
      creadoEn: new Date().getTime()
    });
    setNuevoProd({ nombre: '', codigo: '', fecha: '' });
    setMostrarForm(false);
  };

  const borrarItem = async (itemId) => {
    const itemRef = doc(db, 'despensas', usuarioActual.id, 'items', itemId);
    await deleteDoc(itemRef);
  };

  const calcularDias = (f) => Math.ceil((new Date(f) - new Date()) / (1000 * 60 * 60 * 24));

  const obtenerEstado = (dias) => {
    if (dias < 0) return { titulo: 'VENCIDO', bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-500', icono: '💀' };
    if (dias <= 3) return { titulo: '¡URGENTE!', bg: 'bg-[#FFEBEE]', border: 'border-[#FFCDD2]', text: 'text-red-700', icono: '🔴' };
    if (dias <= 7) return { titulo: 'PLANIFICA', bg: 'bg-[#FFF3E0]', border: 'border-[#FFE0B2]', text: 'text-orange-700', icono: '🟠' };
    return { titulo: 'TRANQUI', bg: 'bg-[#E8F5E9]', border: 'border-[#C8E6C9]', text: 'text-green-700', icono: '🟢' };
  };

  // ==========================================
  // RENDER PANTALLAS LEGALES Y DE CONTACTO (Sin cambios)
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
  // RENDER PANTALLA 2: LOGIN
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
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER PANTALLA 3: DASHBOARD (APP REAL)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FB] font-sans pb-40 flex flex-col relative">
      <header className="px-6 pt-12 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-none italic">comidavencida</h1>
          <div className="flex items-center gap-1 mt-1 opacity-60">
            <Home size={12} className="text-blue-600" />
            <p className="font-bold text-[10px] uppercase tracking-widest text-gray-800">{usuarioActual.id}</p>
          </div>
        </div>
        <button onClick={cerrarSesion} className="bg-white border border-gray-200 p-2.5 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm active:scale-95"><LogOut size={18} /></button>
      </header>

      <main className="flex-1 px-6 mt-2">
        {/* =========================================
            PESTAÑA 1: COMIDA (TU LÓGICA ORIGINAL)
            ========================================= */}
        {tabActivo === 'comida' && (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Tu Semáforo</h2>

            {productos.length === 0 && (
              <div className="py-20 text-center opacity-60 border-2 border-dashed border-gray-200 rounded-[2rem]">
                <p className="text-gray-500 font-bold text-lg">Todo al día</p>
                <p className="text-gray-400 text-sm mt-1">Sincronizado en la nube ☁️</p>
              </div>
            )}

            <div className="space-y-3">
              {productos.sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map((p) => {
                const dias = calcularDias(p.fecha);
                const est = obtenerEstado(dias);
                
                return (
                  <div key={p.id} className={`p-5 rounded-[1.5rem] border-2 flex items-center justify-between transition-all shadow-sm ${est.bg} ${est.border}`}>
                    <div className="flex-1 pr-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px]">{est.icono}</span>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${est.text}`}>{est.titulo}</span>
                      </div>
                      <h3 className={`font-black text-[16px] leading-tight ${dias < 0 ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{p.nombre}</h3>
                      <div className="flex flex-col mt-1">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Vence: {p.fecha.split('-').reverse().join('/')}</p>
                        {/* MOSTRAMOS EL CÓDIGO SI EL PRODUCTO TIENE UNO */}
                        {p.codigo && <p className="text-[9px] font-semibold text-gray-400 uppercase mt-0.5"><ScanBarcode size={10} className="inline mr-1"/>{p.codigo}</p>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 pl-3 border-l border-black/10">
                      <div className="text-center min-w-[3rem]">
                        <span className={`block text-2xl font-black leading-none ${est.text}`}>{Math.abs(dias)}</span>
                        <span className={`text-[8px] font-black uppercase tracking-widest opacity-50`}>días</span>
                      </div>
                      <button onClick={() => borrarItem(p.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors"><Trash2 size={20} /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* BOTONES FLOTANTES SOLO PARA COMIDA */}
            <div className="fixed bottom-[80px] left-0 right-0 p-6 flex flex-col gap-3 pointer-events-none z-30">
              <div className="pointer-events-auto">
                <button onClick={() => setMostrarForm(true)} className="mx-auto w-12 h-12 bg-white text-gray-600 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 border border-gray-100 transition-colors"><Plus size={20} strokeWidth={3} /></button>
              </div>
              <div className="pointer-events-auto">
                <button onClick={() => setMostrarScanner(true)} className="w-full bg-blue-600 text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-[0_15px_30px_rgba(37,99,235,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all"><ScanBarcode size={24} /> Escanear Código</button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            PESTAÑA 2: MASCOTAS (EN CONSTRUCCIÓN)
            ========================================= */}
        {tabActivo === 'mascotas' && (
          <div className="animate-in fade-in duration-300 py-10 text-center">
            <PawPrint size={48} className="mx-auto mb-4 text-orange-300" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Sección Mascotas</h2>
            <p className="text-gray-500 text-sm">Aquí irá el registro de tus mascotas, su control de peso y todo lo demás.</p>
          </div>
        )}

        {/* =========================================
            PESTAÑA 3: MEDICAMENTOS (EN CONSTRUCCIÓN)
            ========================================= */}
        {tabActivo === 'medicamentos' && (
          <div className="animate-in fade-in duration-300 py-10 text-center">
            <Pill size={48} className="mx-auto mb-4 text-indigo-300" />
            <h2 className="text-xl font-black text-gray-900 mb-2">Medicamentos</h2>
            <p className="text-gray-500 text-sm">Aquí configuraremos las alarmas para las medicinas de tus mascotas.</p>
          </div>
        )}

        {/* ÁREA DE PUBLICIDAD GOOGLE ADSENSE INTEGRADA */}
        <div className="mt-8 mb-10 flex justify-center w-full">
          <div className="w-[320px] h-[50px] bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden border border-gray-100">
            <ins className="adsbygoogle"
                 style={{ display: 'inline-block', width: '320px', height: '50px' }}
                 data-ad-client="ca-pub-3386079946838939"
                 data-ad-slot="TU_SLOT_AQUI"></ins>
          </div>
        </div>
      </main>

      {/* =========================================
          NUEVA BARRA DE NAVEGACIÓN INFERIOR (TABS)
          ========================================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe z-40">
        <div className="max-w-md mx-auto flex justify-between px-6 py-3">
          
          <button onClick={() => setTabActivo('comida')} className={`flex flex-col items-center p-2 transition-colors ${tabActivo === 'comida' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Leaf size={22} className={tabActivo === 'comida' ? 'fill-blue-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Comida</span>
          </button>

          <button onClick={() => setTabActivo('mascotas')} className={`flex flex-col items-center p-2 transition-colors ${tabActivo === 'mascotas' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <PawPrint size={22} className={tabActivo === 'mascotas' ? 'fill-orange-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Mascotas</span>
          </button>

          <button onClick={() => setTabActivo('medicamentos')} className={`flex flex-col items-center p-2 transition-colors ${tabActivo === 'medicamentos' ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            <Pill size={22} className={tabActivo === 'medicamentos' ? 'fill-indigo-100' : ''} />
            <span className="text-[9px] font-bold mt-1 uppercase tracking-wider">Medicinas</span>
          </button>

        </div>
      </nav>

      {/* MODAL DE INGRESO MANUAL / ESCANEO (SIN CAMBIOS) */}
      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMostrarForm(false)}></div>
          <div className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-12 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-gray-900 italic">Ingresar Producto</h2>
              <button onClick={() => setMostrarForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition-colors"><X size={18}/></button>
            </div>
            
            <div className="space-y-4">
              {/* CAMPO: NOMBRE DEL PRODUCTO */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1">
                  <Tag size={12} /> Nombre del producto
                </label>
                <input type="text" placeholder="Ej: Leche Descremada" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-lg transition-all" value={nuevoProd.nombre} onChange={(e) => setNuevoProd({...nuevoProd, nombre: e.target.value})} />
              </div>

              {/* CAMPO: CÓDIGO (OPCIONAL) */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1">
                  <ScanBarcode size={12} /> Código (Opcional)
                </label>
                <input type="text" placeholder="Ej: 7801234567" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 transition-all" value={nuevoProd.codigo} onChange={(e) => setNuevoProd({...nuevoProd, codigo: e.target.value})} />
              </div>

              {/* CAMPO: FECHA DE VENCIMIENTO */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-1 mb-1">
                  <Calendar size={12} /> Fecha de vencimiento
                </label>
                <input type="date" className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-blue-200 rounded-2xl outline-none font-bold text-gray-800 text-sm uppercase transition-all" value={nuevoProd.fecha} onChange={(e) => setNuevoProd({...nuevoProd, fecha: e.target.value})} />
              </div>

              <button disabled={!nuevoProd.nombre || !nuevoProd.fecha} onClick={agregarItem} className="w-full bg-gray-900 text-white font-black p-5 rounded-2xl shadow-xl disabled:opacity-30 active:scale-95 uppercase tracking-widest text-xs mt-4 transition-transform">
                Guardar Producto
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarScanner && (
        <Scanner onScan={(codigoDetectado) => {
            // AHORA EL ESCÁNER LLENA EL CÓDIGO Y DEJA EL NOMBRE VACÍO
            setNuevoProd({ nombre: '', codigo: codigoDetectado, fecha: '' });
            setMostrarScanner(false);
            setMostrarForm(true);
          }} onClose={() => setMostrarScanner(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;