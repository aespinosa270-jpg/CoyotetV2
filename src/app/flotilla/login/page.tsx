"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Truck, Lock, Mail, Loader2, ShieldAlert, Eye, EyeOff, ChevronRight } from "lucide-react";

export default function FlotillaLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "email") emailRef.current?.focus();
    if (step === "password") passRef.current?.focus();
  }, [step]);

  // Paso 1: Validar Email
  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/flotilla/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.status === 404) { setError("El correo no está registrado."); return; }
      if (res.status === 403) { setError("Acceso denegado para este rol."); return; }
      if (!res.ok) throw new Error();

      setStep("password");
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Login Final
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/flotilla/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.trim().toLowerCase(), 
          password 
        }),
      });

      if (res.status === 401) {
        setError("Contraseña incorrecta.");
        return;
      }
      if (!res.ok) throw new Error();

      router.replace("/flotilla");
      router.refresh();
    } catch {
      setError("Error interno. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 font-sans">
      
      {/* Coyote Branding */}
      <div className="mb-12 flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-[#FDCB02] rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-yellow-500/20">
          <Truck size={36} className="text-black" strokeWidth={2.5} />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-neutral-600 uppercase tracking-[0.4em] mb-1">Logística</p>
          <h1 className="text-3xl font-[1000] text-white uppercase tracking-tighter leading-none">
            Coyote OS
          </h1>
        </div>
      </div>

      <div className="w-full max-w-sm">
        {step === "email" ? (
          /* FORMULARIO EMAIL */
          <form onSubmit={handleNextStep} className="flex flex-col gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">
                Identificación de Chofer
              </label>
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@huup.mx"
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-2xl py-5 pl-14 pr-5 text-sm font-bold focus:outline-none focus:border-[#FDCB02] focus:ring-1 focus:ring-[#FDCB02] transition-all placeholder:text-neutral-700"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded-2xl p-4 animate-in fade-in zoom-in-95">
                <ShieldAlert size={18} className="text-red-500" />
                <p className="text-xs font-bold text-red-400 leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-[#FDCB02] text-black h-16 rounded-2xl font-[950] uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Continuar <ChevronRight size={18} /></>}
            </button>
          </form>
        ) : (
          /* FORMULARIO PASSWORD */
          <form onSubmit={handleLogin} className="flex flex-col gap-5 animate-in slide-in-from-right-4 duration-300">
            <div className="text-center mb-2">
              <p className="text-[11px] font-bold text-neutral-500 mb-1">Bienvenido de vuelta</p>
              <p className="text-sm font-black text-white truncate">{email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest ml-1">
                Tu Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
                <input
                  ref={passRef}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-2xl py-5 pl-14 pr-14 text-sm font-bold focus:outline-none focus:border-[#FDCB02] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-950/30 border border-red-900/50 rounded-2xl p-4">
                <ShieldAlert size={18} className="text-red-500" />
                <p className="text-xs font-bold text-red-400 leading-tight">{error}</p>
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-[#FDCB02] text-black h-16 rounded-2xl font-[950] uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-yellow-500/10"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Iniciar Jornada"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setPassword(""); setError(""); }}
              className="text-[10px] font-black text-neutral-600 uppercase tracking-widest hover:text-neutral-400 transition-colors py-2"
            >
              ← Usar otro correo
            </button>
          </form>
        )}
      </div>

      <p className="absolute bottom-10 text-[9px] font-bold text-neutral-700 uppercase tracking-[0.5em]">
        Operado por Huup Agency
      </p>
    </div>
  );
}