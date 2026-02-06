"use client"

import { usePathname } from "next/navigation";

// IMPORTAMOS AQUÍ LOS COMPONENTES DE ESTRUCTURA
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar";
import WhatsAppButton from "@/components/ui/whatsapp-button";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // DETECTAR SI ESTAMOS EN LA PÁGINA DE CUENTA
  // Si la ruta es EXACTAMENTE "/cuenta", ocultamos todo
  const isAuthPage = pathname === "/cuenta";

  return (
    <>
      {/* 1. NAVBAR: Solo se muestra si NO estamos en login */}
      {!isAuthPage && (
        <header className="relative z-[60]">
          <Navbar />
        </header>
      )}

      {/* 2. CONTENIDO PRINCIPAL (Siempre se muestra) */}
      <main className="flex-1 w-full relative z-0">
        {children}
      </main>

      {/* 3. FOOTER Y EXTRAS: Solo se muestran si NO estamos en login */}
      {!isAuthPage && (
        <>
          <footer className="relative z-10">
            <Footer />
          </footer>
          <aside>
             <CartSidebar /> 
             <WhatsAppButton /> 
          </aside>
        </>
      )}
    </>
  );
}