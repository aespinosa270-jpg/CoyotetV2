'use client';

import { usePathname } from 'next/navigation';

export default function HideInCRM({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Si la URL es del CRM, del Admin, Flotilla, POS o Central, destruimos los componentes hijos
  if (
    pathname?.startsWith('/crm') || 
    pathname?.startsWith('/flotilla') || 
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/pos') ||
    pathname?.startsWith('/central')
  ) {
    return null;
  }

  // Si es la tienda pública, mostramos todo normal
  return <>{children}</>;
}