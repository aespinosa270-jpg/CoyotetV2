import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. IMPORTAMOS TUS COMPONENTES DE ESTRUCTURA
// Ajustado a la ruta correcta que me mostraste: "components/layout"
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar"; // 👈 ¡ESTE ES EL QUE FALTABA!

// 2. IMPORTAMOS LOS PROVEEDORES
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
          
          {/* Header Fijo */}
          <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-neutral-200 shadow-sm">
             <Navbar />
          </header>

          {/* Contenido Principal */}
          <main className="min-h-screen pt-20 lg:pt-24">
            {children}
          </main>
          
          {/* 👇 AQUÍ ESTÁ LA MAGIA: El Sidebar vive globalmente en la app */}
          <CartSidebar />

          {/* Footer */}
          <footer className="border-t border-neutral-200 bg-neutral-50">
            <Footer />
          </footer>

        </Providers>

      </body>
    </html>
  );
}