// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Imports de tus componentes
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer"; 
import CartSidebar from "@/components/layout/cart-sidebar";
import CookieBanner from "@/components/cookie-banner"; 
import { Providers } from "@/components/providers";

// 🔥 EL INTERRUPTOR QUE ACABAS DE CREAR 🔥
import HideInCRM from "../components/hide-in-crm";

// 🐺 IMPORTA AL COYOTE (Asegúrate que el archivo exista en src/components/CoyoteChat.tsx)
import CoyoteChat from "@/components/CoyoteChat"; 

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
          <div className="flex flex-col min-h-screen relative">
            
            {/* 🔥 INTERRUPTOR: Oculta el Navbar si estás en el CRM 🔥 */}
            <HideInCRM>
              <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
                 <Navbar />
              </header>
            </HideInCRM>

            {/* CONTENIDO PRINCIPAL (Aquí entra la tienda normal o el CRM a pantalla completa) */}
            <main className="flex-grow">
              {children}
            </main>

            {/* 🔥 INTERRUPTOR: Oculta la basura (Footer, Carrito, Cookies) en el CRM 🔥 */}
            <HideInCRM>
              <Footer />
              <CookieBanner />
              <CartSidebar />
              
              {/* 🐺 AQUÍ VIVE EL COYOTE AHORA 🐺 */}
              {/* Lo ponemos aquí para que solo salga en la tienda y no en el panel de admin */}
              <CoyoteChat />
              
            </HideInCRM>
            
          </div>
        </Providers>

      </body>
    </html>
  );
}