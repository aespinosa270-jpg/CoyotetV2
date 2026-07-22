"use client"

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import CartSidebar from "@/components/layout/cart-sidebar";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Si estamos en la página de cuenta, NO mostramos navbar ni footer
  const isAuthPage = pathname === "/cuenta";

  return (
    <>
      {!isAuthPage && (
        <header className="relative z-[60]">
          <Navbar />
        </header>
      )}

      <main className="flex-1 w-full relative z-0">
        {children}
      </main>

      {!isAuthPage && (
        <>
          <footer className="relative z-10">
            <Footer />
          </footer>
          <aside>
             <CartSidebar /> 
          </aside>
        </>
      )}
    </>
  );
}