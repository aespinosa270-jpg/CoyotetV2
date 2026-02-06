import React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// 1. IMPORTAR LOS CONTEXTOS
import { CartProvider } from "@/lib/context/cart-context";
import { AuthProvider } from "@/lib/context/auth-context"; 

// 2. IMPORTAR EL WRAPPER (¡IMPORTANTE! NO IMPORTAR NAVBAR NI FOOTER AQUÍ)
import LayoutWrapper from "@/components/layout/layout-wrapper";
import IntroLoader from "@/components/ui/intro-loader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coyote Textil | Suministro Mayorista",
  description: "Marketplace transaccional de textiles premium.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-[#fcfcfc]`}>
        
        {/* Contextos Globales */}
        <AuthProvider>
          <CartProvider>
            
            <IntroLoader />

            {/* USAMOS EL WRAPPER QUE CONTIENE LA LÓGICA DEL NAVBAR */}
            <LayoutWrapper>
                {children}
            </LayoutWrapper>

          </CartProvider>
        </AuthProvider>

      </body>
    </html>
  );
}