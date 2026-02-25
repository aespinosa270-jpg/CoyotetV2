"use client";

import { LogOut, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BtnFinalizarTurno() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/flotilla/auth/logout", { method: "POST" });
      if (res.ok) {
        // Redirigimos al login y refrescamos para limpiar estados
        router.push("/flotilla/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className="w-full bg-red-50 hover:bg-red-100 p-6 rounded-[2rem] border border-red-100 shadow-sm flex items-center justify-center gap-4 text-red-600 font-[900] uppercase text-xs tracking-widest mt-12 transition-all active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          <LogOut size={20} strokeWidth={2.5} /> 
          Finalizar Turno
        </>
      )}
    </button>
  );
}