import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar";
import CookieBanner from "@/components/cookie-banner";
import { Providers } from "@/components/providers";
import HideInCRM from "../components/hide-in-crm";
import CoyoteChat from "@/components/CoyoteChat";

// Contacto Coyote Textil
// Llamadas:  55 9602 3567
// WhatsApp:  55 3131 4617

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coyote Textil | Infraestructura Nacional",
  description: "Proveeduría estratégica de tejidos de alto rendimiento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>
          <HideInCRM>
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
              <Navbar />
            </header>
          </HideInCRM>

          <main className="w-full">
            {children}
          </main>

          <HideInCRM>
            <Footer />
            <CookieBanner />
            <CartSidebar />
            <CoyoteChat />
          </HideInCRM>
        </Providers>
      </body>
    </html>
  );
}