import type { Metadata } from "next";
import { Inter, Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar";
import CookieBanner from "@/components/cookie-banner";
import { Providers } from "@/components/providers";
import HideInCRM from "../components/hide-in-crm";
import { CoyoteWidget } from "@/components/CoyoteWidget";
// Contacto Coyote Textil
// Llamadas:  55 9602 3567
// WhatsApp:  55 3131 4617
const inter = Inter({ subsets: ["latin"] });
// Coyote Vivo: fuentes del sistema de diseño (variables CSS, no afectan lo existente)
const baloo = Baloo_2({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-baloo" });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800", "900"], variable: "--font-nunito" });
export const metadata: Metadata = {
  title: "Coyote Textil | Infraestructura Nacional",
  description: "Proveeduría estratégica de tejidos de alto rendimiento.",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Aplica el tema guardado ANTES del render para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('coyote-theme');if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} ${baloo.variable} ${nunito.variable}`}>
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
            <CoyoteWidget />
          </HideInCRM>
        </Providers>
      </body>
    </html>
  );
}
