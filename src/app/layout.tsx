import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Imports de tus componentes
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer"; // Asegúrate de que la ruta sea correcta (a veces es @/components/footer)
import CartSidebar from "@/components/layout/cart-sidebar";
import CookieBanner from "@/components/cookie-banner"; // 👈 IMPORTANTE: Importamos el banner
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coyote Textil | Infraestructura Nacional",
  description: "Proveeduría estratégica de tejidos de alto rendimiento.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-white text-neutral-900 antialiased selection:bg-[#FDCB02] selection:text-black`}>
        
        <Providers>
          {/* Contenedor Principal: 
            flex-col + min-h-screen asegura que el footer siempre esté abajo 
          */}
          <div className="flex flex-col min-h-screen relative">
            
            {/* NAVBAR: Sticky */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
               <Navbar />
            </header>

            {/* CONTENIDO PRINCIPAL */}
            <main className="flex-grow">
              {children}
            </main>

            {/* FOOTER */}
            <Footer />

            {/* --- COMPONENTES FLOTANTES GLOBALES --- */}
            
            {/* 1. Banner de Cookies (Aparece abajo) */}
            <CookieBanner />

            {/* 2. Sidebar del Carrito (Aparece a la derecha) */}
            <CartSidebar />
            
          </div>
        </Providers>

      </body>
    </html>
  );
}