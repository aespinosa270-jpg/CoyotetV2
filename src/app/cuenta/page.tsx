"use client"

import { useState, useEffect, useRef, Suspense } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Check, AlertCircle, Loader2, ArrowRight, 
  Globe2, Zap, Ship, ShieldCheck
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

type AuthState = 'login' | 'register' | 'forgot' | 'verify' | 'upsell';

// 1. Movemos la lógica principal a un componente interno
function AccountContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Lee la URL. Si dice ?mode=register, arranca ahí. Si no, arranca en login.
  const initialMode = (searchParams.get('mode') as AuthState) || 'login';

  const [authMode, setAuthMode] = useState<AuthState>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const rightPanelRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    otp: ""
  });

  useEffect(() => {
    if (session && authMode !== 'upsell') {
      router.push("/perfil"); 
    }
  }, [session, router, authMode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (rightPanelRef.current) {
      const rect = rightPanelRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'login') {
        const result = await signIn("credentials", {
          redirect: false,
          email: formData.email,
          password: formData.password,
        });

        if (result?.error) throw new Error("Credenciales incorrectas.");
        router.push('/perfil');
      } 
      else if (authMode === 'register') {
        await new Promise(r => setTimeout(r, 1800)); 
        setSuccessMsg(`Código enviado a ${formData.email}`);
        setAuthMode('verify'); 
      }
      else if (authMode === 'forgot') {
        await new Promise(r => setTimeout(r, 1800));
        setSuccessMsg("Enlace de recuperación enviado.");
        setTimeout(() => setAuthMode('login'), 3500);
      }
      else if (authMode === 'verify') {
        await new Promise(r => setTimeout(r, 1800));
        setAuthMode('upsell'); 
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error en el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ANIMACIONES UX SENIOR CON TIPADO ESTRICTO ---
  const customEase = [0.22, 1, 0.36, 1] as const;

  const containerVars: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3, ease: customEase } }
  };

  const itemVars: Variants = {
    hidden: { opacity: 0, y: 20, filter: "blur(10px)" },
    show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 80, damping: 20 } }
  };

  const formItemVars: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: customEase } }
  };

  const lineVars: Variants = {
    hidden: { width: 0 },
    show: { width: "3rem", transition: { duration: 0.8, ease: customEase, delay: 0.3 } }
  };

  return (
    <div className="min-h-screen flex bg-[#000000] text-white font-sans selection:bg-[#FDCB02] selection:text-black overflow-hidden relative">
      
      {/* =========================================================
          LADO IZQUIERDO: EL MANIFIESTO (A TODO COLOR)
      ========================================================= */}
      <div className="hidden lg:flex w-1/2 relative bg-[#050505] items-center justify-center border-r border-white/5 overflow-hidden">
        
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/assets/coyotelogin.mp4"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-10" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none z-20" />

        <motion.div variants={{hidden:{opacity:0}, show:{opacity:1}}} initial="hidden" animate="show" className="relative z-30 w-full max-w-xl p-12">
            
            <motion.div variants={itemVars}>
              <Link href="/" className="text-[32px] font-[1000] uppercase tracking-tighter italic flex items-center mb-16 drop-shadow-2xl">
                  COYOTE<span className="text-[#FDCB02]">.</span>
              </Link>
            </motion.div>

            <motion.div variants={itemVars} className="mb-10">
              <h2 className="text-8xl xl:text-[100px] font-[1000] uppercase tracking-tighter leading-[0.82] text-white drop-shadow-2xl">
                 VISTIENDO<br/>
                 LA<br/>
                 <span className="text-[#FDCB02]">FUERZA</span> DE<br/>
                 MÉXICO.
              </h2>
            </motion.div>

            <motion.div variants={itemVars} className="relative mb-16">
              <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#FDCB02] shadow-[0_0_15px_rgba(253,203,2,0.5)]" />
              <p className="text-xl font-black uppercase tracking-[0.15em] text-white pl-8 leading-tight drop-shadow-md">
                Lo mejor del mundo textil,<br/>
                <span className="text-neutral-300">a un click de distancia.</span>
              </p>
            </motion.div>

            <motion.div variants={itemVars} className="flex flex-col gap-8">
               {[
                 { icon: Globe2, title: "Inventario disponible", subtitle: "Visualización en tiempo real" },
                 { icon: Zap, title: "Precios de Fábrica", subtitle: "Costos directos de manufactura" },
                 { icon: Ship, title: "Logística en toda la república", subtitle: "a un click de distancia" }
               ].map((item, i) => (
                 <motion.div key={i} whileHover={{ x: 10 }} className="flex items-center gap-6 group cursor-default">
                    <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-[#FDCB02] transition-all duration-300 backdrop-blur-sm">
                      <item.icon size={18} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-[1000] uppercase tracking-widest text-white group-hover:text-[#FDCB02] transition-colors drop-shadow-md">{item.title}</span>
                      <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest drop-shadow-md">{item.subtitle}</span>
                    </div>
                 </motion.div>
               ))}
            </motion.div>
        </motion.div>
      </div>

      {/* =========================================================
          LADO DERECHO: DISEÑO EDITORIAL B2B
      ========================================================= */}
      <div 
        ref={rightPanelRef}
        onMouseMove={handleMouseMove}
        className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 relative bg-[#000000] z-40 overflow-hidden"
      >
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.03, 0.08, 0.03] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,_#FDCB02_0%,_transparent_55%)]"
        />

        <div 
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 opacity-0 lg:opacity-100"
          style={{ background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(253, 203, 2, 0.04), transparent 50%)` }}
        />

        <div className="w-full max-w-[420px] relative z-20">
          
          <div className="absolute -top-10 -left-10 text-neutral-800 pointer-events-none">+</div>
          <div className="absolute -top-10 -right-10 text-neutral-800 pointer-events-none">+</div>
          <div className="absolute -bottom-10 -left-10 text-neutral-800 pointer-events-none">+</div>
          <div className="absolute -bottom-10 -right-10 text-neutral-800 pointer-events-none">+</div>

          <AnimatePresence mode="wait">
            
            {/* =======================
                1. LOGIN 
            ======================= */}
            {authMode === 'login' && (
              <motion.div key="login" variants={containerVars} initial="hidden" animate="show" exit="exit" className="w-full relative">
                
                <motion.div variants={formItemVars} className="mb-14">
                    <div className="mb-8">
                      <Image 
                        src="/coyotelogo.svg" 
                        alt="Coyote Logo" 
                        width={180} 
                        height={45} 
                        className="object-contain"
                      />
                    </div>
                    <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                      <span className="text-white">INICIAR</span> <span className="text-[#FDCB02]">SESIÓN</span>
                    </h1>
                    <motion.div variants={lineVars} className="h-[4px] bg-[#FDCB02] mt-4" />
                </motion.div>

                {error && <motion.div variants={formItemVars} className="mb-8 p-4 bg-red-950/30 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><AlertCircle size={16} strokeWidth={2}/> {error}</motion.div>}
                {successMsg && <motion.div variants={formItemVars} className="mb-8 p-4 bg-green-950/30 border border-green-500/50 text-green-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><Check size={16} strokeWidth={2}/> {successMsg}</motion.div>}

                <form onSubmit={handleSubmit} className="space-y-10">
                  <motion.div variants={formItemVars}>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">E-mail</label>
                    <input 
                      type="email" name="email" value={formData.email} onChange={handleInputChange} required 
                      className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none placeholder:text-neutral-800 px-0" 
                      placeholder="ceo@empresa.com"
                    />
                  </motion.div>
                  
                  <motion.div variants={formItemVars}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500">Contraseña</label>
                      <button type="button" onClick={() => setAuthMode('forgot')} className="text-[10px] text-[#FDCB02] font-black uppercase tracking-widest hover:text-white transition-colors">¿Olvidadaste tu contraseña?</button>
                    </div>
                    <input 
                      type="password" name="password" value={formData.password} onChange={handleInputChange} required 
                      className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none placeholder:text-neutral-800 px-0" 
                      placeholder="••••••••"
                    />
                  </motion.div>
                  
                  <motion.div variants={formItemVars} className="pt-4">
                      <button disabled={isLoading} className="w-full h-16 bg-white hover:bg-[#FDCB02] text-black font-[1000] text-sm uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-between px-8 group rounded-none">
                        {isLoading ? <Loader2 size={24} className="animate-spin mx-auto"/> : (
                          <>
                            <span>INICIAR SESIÓN</span>
                            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-2 transition-transform duration-300"/>
                          </>
                        )}
                      </button>
                  </motion.div>
                </form>

                <motion.div variants={formItemVars} className="mt-14 pt-8 border-t border-white/10 text-center">
                  <button onClick={() => setAuthMode('register')} className="text-[11px] text-neutral-500 hover:text-white font-black uppercase tracking-widest transition-colors">
                    ¿No tienes cuenta? <span className="text-[#FDCB02] ml-1">Regístrate</span>
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* =======================
                2. REGISTRO 
            ======================= */}
            {authMode === 'register' && (
              <motion.div key="register" variants={containerVars} initial="hidden" animate="show" exit="exit" className="w-full">
                 <motion.div variants={formItemVars} className="mb-12">
                    <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                      <span className="text-white">CREAR</span><br/><span className="text-[#FDCB02]">CUENTA</span>
                    </h1>
                    <motion.div variants={lineVars} className="h-[4px] bg-[#FDCB02] mt-4" />
                </motion.div>
                <form onSubmit={handleSubmit} className="space-y-8">
                  <motion.div variants={formItemVars}>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">Razón Social o Nombre completo</label>
                    <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none px-0"/>
                  </motion.div>
                  <motion.div variants={formItemVars}>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">e-mail</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none px-0"/>
                  </motion.div>
                  <motion.div variants={formItemVars}>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">Contraseña</label>
                    <input type="password" name="password" value={formData.password} onChange={handleInputChange} required minLength={8} className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none px-0 placeholder:text-neutral-800" placeholder="Mínimo 8 caracteres"/>
                  </motion.div>
                  
                  <motion.div variants={formItemVars} className="pt-4">
                      <button disabled={isLoading} className="w-full h-16 bg-[#FDCB02] hover:bg-white text-black font-[1000] text-sm uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-between px-8 group rounded-none">
                        {isLoading ? <Loader2 size={24} className="animate-spin mx-auto"/> : (
                          <>
                            <span>REGISTRARSE</span>
                            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-2 transition-transform duration-300"/>
                          </>
                        )}
                      </button>
                  </motion.div>
                </form>
                <motion.div variants={formItemVars} className="mt-14 pt-8 border-t border-white/10 text-center">
                  <button onClick={() => setAuthMode('login')} className="text-[11px] font-black text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
                      ← Volver al login
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* =======================
                3. RECUPERAR CONTRASEÑA 
            ======================= */}
            {authMode === 'forgot' && (
              <motion.div key="forgot" variants={containerVars} initial="hidden" animate="show" exit="exit" className="w-full">
                 <motion.div variants={formItemVars} className="mb-12">
                    <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                      <span className="text-white">RECUPERAR</span><br/><span className="text-[#FDCB02]">ACCESO</span>
                    </h1>
                    <motion.div variants={lineVars} className="h-[4px] bg-[#FDCB02] mt-4 mb-6" />
                    <p className="text-neutral-400 font-bold text-[11px] uppercase tracking-widest leading-relaxed">
                      Enviaremos instrucciones de recuperación a tu correo.
                    </p>
                 </motion.div>
                 
                 {successMsg && <motion.div variants={formItemVars} className="mb-8 p-4 bg-green-950/30 border border-green-500/50 text-green-500 text-[10px] font-black uppercase tracking-widest">{successMsg}</motion.div>}
                 
                 {!successMsg && (
                   <form onSubmit={handleSubmit} className="space-y-10">
                     <motion.div variants={formItemVars}>
                       <label className="block text-[11px] font-black uppercase tracking-widest text-neutral-500 mb-2">e-mail</label>
                       <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className="w-full h-12 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] outline-none font-bold text-lg text-white transition-colors rounded-none px-0 placeholder:text-neutral-800" placeholder="ceo@empresa.com"/>
                     </motion.div>
                     <motion.div variants={formItemVars} className="pt-2">
                       <button disabled={isLoading} className="w-full h-16 bg-white hover:bg-[#FDCB02] text-black font-[1000] text-sm uppercase tracking-[0.2em] transition-colors duration-300 flex items-center justify-center rounded-none">
                         {isLoading ? <Loader2 size={24} className="animate-spin"/> : "ENVIAR ENLACE"}
                       </button>
                     </motion.div>
                   </form>
                 )}
                 <motion.div variants={formItemVars} className="mt-14 pt-8 border-t border-white/10 text-center">
                  <button onClick={() => setAuthMode('login')} className="text-[11px] font-black text-neutral-500 hover:text-white uppercase tracking-widest transition-colors">
                      ← CANCELAR
                  </button>
                 </motion.div>
              </motion.div>
            )}

            {/* =======================
                4. VERIFICACIÓN OTP 
            ======================= */}
            {authMode === 'verify' && (
              <motion.div key="verify" variants={containerVars} initial="hidden" animate="show" exit="exit" className="w-full">
                 <motion.div variants={formItemVars} className="mb-12">
                    <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                      <span className="text-white">VERIFICAR</span><br/><span className="text-[#FDCB02]">CORREO</span>
                    </h1>
                    <motion.div variants={lineVars} className="h-[4px] bg-[#FDCB02] mt-4 mb-6" />
                    <p className="text-neutral-400 font-bold text-[11px] uppercase tracking-widest leading-relaxed">
                      Se ha enviado un código a:<br/><span className="text-white mt-1 inline-block">{formData.email}</span>
                    </p>
                 </motion.div>
                <form onSubmit={handleSubmit} className="space-y-10">
                  <motion.div variants={formItemVars}>
                    <input type="text" name="otp" placeholder="••••••" value={formData.otp} onChange={handleInputChange} maxLength={6} required className="w-full h-20 bg-transparent border-b-2 border-white/20 focus:border-[#FDCB02] text-center text-5xl font-[1000] tracking-[0.5em] outline-none text-[#FDCB02] transition-colors rounded-none placeholder:text-neutral-800 px-0"/>
                  </motion.div>
                  <motion.div variants={formItemVars}>
                    <button disabled={isLoading} className="w-full h-16 bg-white hover:bg-[#FDCB02] text-black font-[1000] text-sm uppercase tracking-[0.2em] flex items-center justify-center transition-colors duration-300 rounded-none">
                      {isLoading ? <Loader2 size={24} className="animate-spin"/> : "VALIDAR CÓDIGO"}
                    </button>
                  </motion.div>
                </form>
              </motion.div>
            )}

            {/* =======================
                5. UPSELL / CUENTA CREADA 
            ======================= */}
            {authMode === 'upsell' && (
              <motion.div key="upsell" variants={containerVars} initial="hidden" animate="show" exit="exit" className="w-full">
                 <motion.div variants={formItemVars} className="mb-12">
                    <h1 className="text-5xl font-[1000] uppercase tracking-tighter leading-none italic">
                      <span className="text-white">CUENTA</span><br/><span className="text-[#FDCB02]">CREADA</span>
                    </h1>
                    <motion.div variants={lineVars} className="h-[4px] bg-[#FDCB02] mt-4 mb-6" />
                    <p className="text-neutral-400 font-bold text-[11px] uppercase tracking-widest leading-relaxed">
                      Bienvenido a Coyote Textil. Para desbloquear precios directos de fábrica en el catálogo, requieres una membresía de socio.
                    </p>
                 </motion.div>
                 <motion.div variants={formItemVars} className="flex flex-col gap-5 relative z-10">
                    <button onClick={() => router.push('/membresia')} className="w-full h-16 bg-[#FDCB02] hover:bg-white text-black font-[1000] text-sm uppercase tracking-[0.2em] flex items-center justify-center transition-colors duration-300 rounded-none">
                      ADQUIRIR MEMBRESÍA
                    </button>
                    <button onClick={() => router.push('/catalogo')} className="w-full h-14 bg-transparent border-2 border-white/20 text-neutral-400 hover:text-white hover:border-white font-black text-[11px] uppercase tracking-widest transition-colors duration-300 rounded-none">
                      IR AL CATÁLOGO (MODO LECTURA)
                    </button>
                 </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// 2. Exportamos el componente envolviendo la lógica en Suspense
export default function AccountPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex bg-black items-center justify-center text-[#FDCB02]">
        <Loader2 className="animate-spin" size={40} />
      </div>
    }>
      <AccountContent />
    </Suspense>
  );
}