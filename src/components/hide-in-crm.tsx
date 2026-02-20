// src/components/hide-in-crm.tsx
'use client';

import { usePathname } from 'next/navigation';

export default function HideInCRM({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Si la URL empieza con /crm, destruimos (ocultamos) los componentes hijos
  if (pathname?.startsWith('/crm')) {
    return null;
  }

  // Si es la tienda pública, mostramos todo normal
  return <>{children}</>;
}