import ClientesClient from './_components/ClientesClient';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

// Le decimos a Next.js que siempre traiga datos frescos, nada de cachés viejos
export const dynamic = 'force-dynamic';

export default async function ClientesPage() {
  // 1. FETCH A LA BASE DE DATOS
  // Traemos a todos los usuarios ordenados por los más nuevos primero
  const rawClients = await prisma.user.findMany({
    orderBy: {
      createdAt: 'desc'
    }
  });

  // 2. SERIALIZACIÓN
  // Formateamos las fechas y nos aseguramos de no pasar objetos complejos al cliente
  const formattedClients = rawClients.map((client) => ({
    id: client.id,
    hashId: client.hashId,
    name: client.name || 'Sin nombre',
    email: client.email,
    phone: client.phone || 'Sin teléfono',
    rfc: client.rfc || 'Público General',
    ltv: client.ltv,
    points: client.points,
    membershipTier: client.membershipTier,
    createdAt: new Intl.DateTimeFormat('es-MX', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }).format(client.createdAt),
  }));

  // 3. RENDERIZAMOS EL CLIENTE CON LOS DATOS Y EL HEADER
  return (
    <div className="p-6 md:p-8 w-full max-w-[1600px] mx-auto">
      
      {/* ─── HEADER COYOTE ADMIN ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-1">
            CRM / DIRECTORIO
          </p>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic flex items-center gap-2">
            <span className="text-black">BASE DE</span>
            <span className="text-[#FDCB02]">CLIENTES</span>
          </h1>
        </div>
        
        {/* BOTÓN NUEVO CLIENTE */}
        <Link 
          href="/crm/admin/clientes/nuevo"
          className="bg-black text-[#FDCB02] text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl border border-[#FDCB02]/20 hover:bg-[#FDCB02] hover:text-black transition-all shadow-lg flex items-center gap-2"
        >
          + Nuevo Cliente
        </Link>
      </div>

      <ClientesClient initialData={formattedClients} />
    </div>
  );
}