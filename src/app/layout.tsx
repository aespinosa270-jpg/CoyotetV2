import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// IMPORTANTE: Importamos tu componente maestro de proveedores
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
      <body className={`${inter.className} bg-[#050505] text-white antialiased`}>
        
        {/* AQUÍ OCURRE LA MAGIA:
            Envolvemos toda la app con 'Providers'.
            Esto inyecta SessionProvider -> AuthProvider -> CartProvider
            a todas las páginas automáticamente.
        */}
        <Providers>
          {children}
        </Providers>

      </body>
    </html>
  );
}