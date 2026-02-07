import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Imports de tus componentes
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar";
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
          <div className="flex flex-col min-h-screen">
            
            {/* NAVBAR: 
              Cambiamos 'fixed' por 'sticky'. 
              Esto hace que el Navbar ocupe su espacio real y NO tape el contenido, 
              pero se sigue quedando pegado arriba al hacer scroll.
            */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
               <Navbar />
            </header>

            {/* CONTENIDO: 
              'flex-grow' hace que esta sección use todo el espacio disponible,
              empujando el footer hacia abajo. 
            */}
            <main className="flex-grow">
              {children}
            </main>

            {/* FOOTER: 
              Simplemente lo dejamos en el flujo normal al final de la página.
            */}
            <Footer />

            {/* Componente global del Carrito (flota por encima del layout) */}
            <CartSidebar />
            
          </div>
        </Providers>

      </body>
    </html>
  );
}