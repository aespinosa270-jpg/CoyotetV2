"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type CartItem = {
  id: string
  title: string
  price: number
  quantity: number
  variantId: string // 'corte' | 'rollo'
  unit: string      // 'Kilo' | 'Metro'
  thumbnail?: string
}

interface CartContextType {
  cart: CartItem[]
  addItem: (item: Omit<CartItem, "id">) => void
  removeItem: (id: string) => void
  toggleCart: () => void
  isCartOpen: boolean
  
  // FINANZAS
  subTotal: number
  serviceFee: number
  grandTotal: number
  totalItems: number
}

const CartContext = createContext<CartContextType | null>(null)

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isClient, setIsClient] = useState(false)

  // Cargar
  useEffect(() => {
    setIsClient(true)
    const saved = localStorage.getItem("coyote_marketplace_cart_v2")
    if (saved) {
      try { setCart(JSON.parse(saved)) } catch (e) { console.error(e) }
    }
  }, [])

  // Guardar
  useEffect(() => {
    if (isClient) {
      localStorage.setItem("coyote_marketplace_cart_v2", JSON.stringify(cart))
    }
  }, [cart, isClient])

  const addItem = (newItem: Omit<CartItem, "id">) => {
    setCart((prev) => {
      // ID único combinando producto y variante
      const uniqueId = `${newItem.title}-${newItem.variantId}`
      const existing = prev.find((i) => i.id === uniqueId)
      if (existing) {
        return prev.map((i) => 
          i.id === uniqueId ? { ...i, quantity: i.quantity + newItem.quantity } : i
        )
      }
      return [...prev, { ...newItem, id: uniqueId }]
    })
    setIsCartOpen(true)
  }

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const toggleCart = () => setIsCartOpen(!isCartOpen)

  // --- MATEMÁTICA FINANCIERA ---
  const totalItems = cart.reduce((acc, item) => acc + 1, 0) // Contamos líneas de pedido, no unidades totales
  
  // 1. Subtotal (Precio * Cantidad real, ejemplo: $160 * 26kg)
  const subTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  
  // 2. Cargo por servicio (4.99%)
  const serviceFee = subTotal * 0.0499
  
  // 3. Gran Total
  const grandTotal = subTotal + serviceFee

  return (
    <CartContext.Provider value={{ 
      cart, addItem, removeItem, toggleCart, isCartOpen, 
      subTotal, serviceFee, grandTotal, totalItems 
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider")
  return context
}