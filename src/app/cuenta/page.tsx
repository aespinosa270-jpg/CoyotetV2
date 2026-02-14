"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react"; // 👈 IMPORTANTE: Usamos NextAuth

export default function AccountPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Para mostrar error de contraseña
  
  // Si ya está logueado, lo mandamos al home
  useEffect(() => {
    if (session) {
      router.push("/"); 
    }
  }, [session, router]);

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
    setError(null); // Limpiar error al escribir
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (authMode === 'login') {
        // 🔥 LOGIN REAL CON NEXTAUTH
        const result = await signIn("credentials", {
            redirect: false, // No redirigir automático para poder manejar errores
            email: formData.email,
            password: formData.password,
        });

        if (result?.error) {
            setIsLoading(false);
            setError("Credenciales incorrectas. Verifica tu contraseña.");
        } else {
            // Login exitoso -> El useEffect redirigirá
            router.refresh(); // Refrescar para actualizar la UI del navbar
        }
    } else {
        // Registro (Aquí deberías llamar a tu API de registro real)
        // Por ahora simulamos un error o éxito
        setIsLoading(false);
        alert("El registro público aún no está activo. Usa las cuentas de prueba.");
    }
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
              
              {/* MENSAJE DE ERROR */}
              {error && (
                  <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={14}/> {error}
                  </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 pl-1">Email</label>
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

              {/* ... Resto del footer del form ... */}
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
            /* --- MODO REGISTRO (Simplificado para el ejemplo) --- */
            <motion.div
              key="register"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
               {/* ... (Mantén tu form de registro igual, pero en el submit maneja la creación real) ... */}
               <h1 className="text-3xl font-[900] mb-6 tracking-tight">Crear cuenta</h1>
               <p className="text-sm text-neutral-500 mb-4">El registro público está deshabilitado temporalmente. Contacta a ventas.</p>
               <button onClick={() => setAuthMode('login')} className="text-black font-bold underline">Volver al login</button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}