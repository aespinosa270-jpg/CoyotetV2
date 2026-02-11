'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

// Tipos
export interface CartItem {
  id: string;        // ID único generado (ej: "prod_123-rollo-rojo")
  productId: string; // ID base del producto (ej: "prod_123")
  title: string;
  price: number;
  image: string;
  quantity: number;
  unit: string;
  meta?: {
    mode?: 'kilo' | 'rollo';
    packages?: number;
    color?: string; // 👈 Importante para mostrar el color en el carrito
    [key: string]: any;
  };
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. Cargar carrito de localStorage (Solo en el cliente)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCart = localStorage.getItem('coyote-cart');
      if (savedCart) {
        try {
          setItems(JSON.parse(savedCart));
        } catch (e) {
          console.error("Error cargando carrito:", e);
          localStorage.removeItem('coyote-cart');
        }
      }
      setIsInitialized(true);
    }
  }, []);

  // 2. Guardar en localStorage cada vez que cambia
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('coyote-cart', JSON.stringify(items));
    }
  }, [items, isInitialized]);

  const addItem = (newItem: CartItem) => {
    setItems((prev) => {
      // Buscamos por el ID compuesto (producto + variante + color)
      const existing = prev.find((i) => i.id === newItem.id);
      if (existing) {
        // Si ya existe la misma variante exacto, sumamos la cantidad
        return prev.map((i) =>
          i.id === newItem.id
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      // Si no existe, lo agregamos como línea nueva
      return [...prev, newItem];
    });
    // Abrir el sidebar automáticamente al agregar da buena UX
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i))
    );
  };

  const clearCart = () => setItems([]);

  // CÁLCULOS
  // Usamos items.length para el badge (número de líneas distintas), 
  // ya que sumar kilos (ej. 500) se ve mal en un icono de notificación.
  const totalItems = items.length;
  
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  return (
    <CartContext.Provider value={{ 
      items, 
      addItem, 
      removeItem, 
      updateQuantity, 
      clearCart, 
      totalItems, 
      subtotal,
      isCartOpen, 
      openCart, 
      closeCart 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de CartProvider');
  return context;
};