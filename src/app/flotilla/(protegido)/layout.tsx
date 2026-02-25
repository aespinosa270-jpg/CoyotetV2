// src/app/flotilla/layout.tsx
import Link from "next/link";
import { Package, Map, History, UserCircle } from "lucide-react";
import { getFlotillaSession } from "@/lib/flotilla-auth";
import { redirect } from "next/navigation";

export default async function FlotillaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Verificación de sesión con el auth personalizado
  const session = await getFlotillaSession();

  // Si no hay sesión activa, redirigimos al login específico de flotilla
  if (!session) {
    redirect("/flotilla/login");
  }

  // 2. Interfaz de la App (Protegida)
  return (
    // Contenedor principal: Combina max-w-md (para parecer app móvil)
    // con h-[100dvh] y overflow-hidden para mantener todo autocontenido.
    <div className="max-w-md mx-auto relative flex flex-col h-[100dvh] bg-neutral-100 font-sans shadow-2xl overflow-hidden">
      
      {/* HEADER DE LA APP */}
      <header className="bg-black text-white px-4 py-3 flex items-center justify-between shadow-md z-10 safe-top shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#FDCB02] rounded-full flex items-center justify-center font-black text-black text-xs">
            🐺
          </div>
          <div>
            <h1 className="text-sm font-[1000] uppercase tracking-widest leading-none">Coyote Logística</h1>
            <p className="text-[10px] text-[#FDCB02] font-bold">
              {/* Ajusta "session.name" según la propiedad que devuelva tu getFlotillaSession */}
              {session?.name || "Unidad Activa"}
            </p>
          </div>
        </div>
      </header>

      {/* ÁREA DE PANTALLAS (El contenido de la app) */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* BOTTOM NAVIGATION (Menú tipo App) */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-neutral-200 flex justify-around items-center h-16 pb-safe z-50">
        <Link href="/flotilla" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-black focus:text-black transition-colors">
          <Package size={20} />
          <span className="text-[9px] font-bold uppercase">Ruta Hoy</span>
        </Link>
        <Link href="/flotilla/mapa" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-black focus:text-black transition-colors">
          <Map size={20} />
          <span className="text-[9px] font-bold uppercase">Mapa</span>
        </Link>
        <Link href="/flotilla/historial" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-black focus:text-black transition-colors">
          <History size={20} />
          <span className="text-[9px] font-bold uppercase">Entregados</span>
        </Link>
        <Link href="/flotilla/perfil" className="flex flex-col items-center gap-1 text-neutral-400 hover:text-black focus:text-black transition-colors">
          <UserCircle size={20} />
          <span className="text-[9px] font-bold uppercase">Chofer</span>
        </Link>
      </nav>
    </div>
  );
}