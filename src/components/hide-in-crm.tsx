'use client';

import { usePathname } from 'next/navigation';

export default function HideInCRM({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Si la URL es del CRM, del Admin o de la Flotilla, destruimos (ocultamos) los componentes hijos
  if (
    pathname?.startsWith('/crm') || 
    pathname?.startsWith('/flotilla') || 
    pathname?.startsWith('/admin')
  ) {
    return null;
  }

  // Si es la tienda pública, mostramos todo normal
  return <>{children}</>;
}