import ClientesClient from './_components/ClientesClient';
import { prisma } from '@/lib/prisma';

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

  // 3. RENDERIZAMOS EL CLIENTE CON LOS DATOS
  return (
    <ClientesClient initialData={formattedClients} />
  );
}