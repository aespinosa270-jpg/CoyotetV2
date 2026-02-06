"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/auth-context"; // Usamos el contexto real

export default function AccountPage() {
  const { login, user } = useAuth(); // Hooks del contexto
  const router = useRouter();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  
  // Si ya está logueado, lo mandamos al home o al dashboard
  useEffect(() => {
    if (user) {
      router.push("/"); 
    }
  }, [user, router]);

  // Estados Formulario
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    termsAccepted: false,
    promoAccepted: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulación de API (Aquí conectamos el AuthContext)
    setTimeout(() => {
      setIsLoading(false);
      
      // GUARDAMOS LA SESIÓN REAL
      login({
        name: formData.name || "Usuario Coyote",
        email: formData.email,
        role: "gold"
      });

      // No hace falta redirigir manual, el useEffect lo hará al detectar el usuario
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-12 font-sans text-black selection:bg-[#FDCB02] selection:text-black">
      
      {/* LOGO CENTRADO */}
      <div className="mb-8">
        <Link href="/" className="text-4xl font-[1000] uppercase tracking-tighter flex items-center gap-1">
            COYOTE<span className="text-[#FDCB02]">.</span>
            <span className="text-[10px] font-mono text-neutral-400 font-normal tracking-widest mt-3 ml-2">ID</span>
        </Link>
      </div>

      {/* CAJA PRINCIPAL */}
      <div className="w-full max-w-[380px] bg-white border border-neutral-200 rounded-sm p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] relative">
        
        <AnimatePresence mode="wait">
          {authMode === 'login' ? (
            /* --- MODO LOGIN --- */
            <motion.div
              key="login"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-[900] mb-6 tracking-tight">Iniciar sesión</h1>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 pl-1">Email o celular</label>
                  <input 
                    type="email" 
                    name="email"
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 border border-neutral-300 rounded-[3px] px-3 focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5 pl-1">
                    <label className="block text-[11px] font-bold uppercase tracking-widest">Contraseña</label>
                    <a href="#" className="text-[10px] text-neutral-500 hover:text-[#FDCB02] hover:underline transition-colors">¿Olvidaste tu contraseña?</a>
                  </div>
                  <input 
                    type="password" 
                    name="password"
                    onChange={handleInputChange}
                    required
                    className="w-full h-11 border border-neutral-300 rounded-[3px] px-3 focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all font-medium text-sm"
                  />
                </div>

                <button 
                  disabled={isLoading}
                  className="w-full h-11 bg-[#FDCB02] hover:bg-[#eebb02] text-black font-[900] text-sm uppercase tracking-wide rounded-[3px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin"/> : "CONTINUAR"}
                </button>
              </form>

              <div className="mt-8 text-[11px] text-neutral-600 leading-relaxed text-justify">
                Al continuar, aceptas las <a href="#" className="text-black underline decoration-1 hover:text-[#FDCB02] decoration-neutral-300">Condiciones de Uso</a> y el <a href="#" className="text-black underline decoration-1 hover:text-[#FDCB02] decoration-neutral-300">Aviso de Privacidad</a> de Coyote Industrial.
              </div>

              <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                <p className="text-xs text-neutral-500 mb-4 font-medium">¿Eres nuevo en Coyote?</p>
                <button 
                  onClick={() => setAuthMode('register')}
                  type="button"
                  className="w-full h-10 bg-white border border-neutral-300 hover:bg-neutral-50 text-black font-[900] text-xs uppercase tracking-wide rounded-[3px] shadow-sm transition-all"
                >
                  Crea tu cuenta empresarial
                </button>
              </div>

            </motion.div>
          ) : (
            /* --- MODO REGISTRO --- */
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-[900] mb-6 tracking-tight">Crear cuenta</h1>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 pl-1">Tu nombre</label>
                  <input 
                    type="text" 
                    name="name"
                    onChange={handleInputChange}
                    required
                    placeholder="Nombre y Apellido"
                    className="w-full h-10 border border-neutral-300 rounded-[3px] px-3 focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all font-medium text-sm placeholder:text-neutral-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 pl-1">Correo electrónico</label>
                  <input 
                    type="email" 
                    name="email"
                    onChange={handleInputChange}
                    required
                    className="w-full h-10 border border-neutral-300 rounded-[3px] px-3 focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all font-medium text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 pl-1">Contraseña</label>
                  <input 
                    type="password" 
                    name="password"
                    onChange={handleInputChange}
                    required
                    placeholder="Al menos 6 caracteres"
                    className="w-full h-10 border border-neutral-300 rounded-[3px] px-3 focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] outline-none transition-all font-medium text-sm placeholder:text-neutral-400"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1 pl-1 flex items-center gap-1"><AlertCircle size={10}/> La contraseña debe ser segura</p>
                </div>

                {/* CHECKBOXES REQUERIDOS */}
                <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 min-w-[16px] mt-0.5 border rounded-[2px] flex items-center justify-center transition-colors ${formData.termsAccepted ? 'bg-[#FDCB02] border-[#FDCB02]' : 'border-neutral-300 bg-white'}`}>
                            {formData.termsAccepted && <Check size={10} className="text-black stroke-[4]" />}
                        </div>
                        <input 
                            type="checkbox" 
                            name="termsAccepted"
                            className="hidden"
                            onChange={handleInputChange}
                            required
                        />
                        <span className="text-[11px] leading-tight text-neutral-600">
                            Acepto los <a href="#" className="text-black underline font-bold">Términos y Condiciones</a> y la <a href="#" className="text-black underline font-bold">Política de Privacidad</a>. <span className="text-red-500">*</span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group select-none">
                        <div className={`w-4 h-4 min-w-[16px] mt-0.5 border rounded-[2px] flex items-center justify-center transition-colors ${formData.promoAccepted ? 'bg-[#FDCB02] border-[#FDCB02]' : 'border-neutral-300 bg-white'}`}>
                            {formData.promoAccepted && <Check size={10} className="text-black stroke-[4]" />}
                        </div>
                        <input 
                            type="checkbox" 
                            name="promoAccepted"
                            className="hidden"
                            onChange={handleInputChange}
                        />
                        <span className="text-[11px] leading-tight text-neutral-600">
                            Deseo recibir ofertas exclusivas, novedades y promociones de Coyote.
                        </span>
                    </label>
                </div>

                <button 
                  disabled={isLoading || !formData.termsAccepted}
                  className="w-full h-10 bg-[#FDCB02] hover:bg-[#eebb02] text-black font-[900] text-sm uppercase tracking-wide rounded-[3px] shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin"/> : "CREAR CUENTA COYOTE"}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-neutral-100 text-center">
                <p className="text-xs text-neutral-600">
                    ¿Ya tienes una cuenta? <button onClick={() => setAuthMode('login')} className="text-black font-bold hover:text-[#FDCB02] underline">Iniciar sesión</button>
                </p>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* FOOTER MINIMALISTA */}
      <footer className="mt-12 w-full max-w-[380px] border-t border-neutral-200 pt-8 text-center space-y-4 opacity-70 hover:opacity-100 transition-opacity">
         <div className="flex justify-center gap-6 text-[10px] text-black font-bold uppercase tracking-wider">
            <a href="#" className="hover:underline hover:text-[#FDCB02]">Condiciones de uso</a>
            <a href="#" className="hover:underline hover:text-[#FDCB02]">Aviso de privacidad</a>
            <a href="#" className="hover:underline hover:text-[#FDCB02]">Ayuda</a>
         </div>
         <p className="text-[10px] text-neutral-400 font-mono">
            © 2022-2026, Coyote Textil, Inc. o sus afiliados
         </p>
      </footer>

    </div>
  );
}