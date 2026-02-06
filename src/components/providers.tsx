"use client"

import { SessionProvider } from "next-auth/react"
import { CartProvider } from "@/lib/context/cart-context"
// Importamos el nuevo AuthProvider
import { AuthProvider } from "@/lib/context/auth-context" 

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider> {/* <--- AGREGADO AQUÍ */}
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </SessionProvider>
  )
}