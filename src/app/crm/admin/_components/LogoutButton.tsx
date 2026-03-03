"use client";

// Componente client mínimo que encapsula el signOut.
// El dashboard es Server Component — no puede llamar signOut directamente.
// Al separarlo aquí, evitamos hacer "use client" en toda la página.

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="p-2 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg transition-all flex items-center gap-2"
    >
      <LogOut size={16} />
      <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Salir</span>
    </button>
  );
}