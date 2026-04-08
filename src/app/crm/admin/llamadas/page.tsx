import LlamadasClient from './_components/LlamadasClient';
import { prisma } from '@/lib/prisma'; 

export const dynamic = 'force-dynamic';

export default async function LlamadasPage() {
  // 1. FETCH REAL A TU TABLA INTERACTION
  // Traemos solo las interacciones de tipo LLAMADA e incluimos al Empleado y al Cliente
  const rawInteractions = await prisma.interaction.findMany({
    where: {
      type: 'LLAMADA',
    },
    orderBy: {
      date: 'desc' 
    },
    include: {
      employee: true, // Trae los datos del vendedor/agente
      user: true,     // Trae los datos del cliente
    }
  });

  // 2. SERIALIZACIÓN / MAPEO AL CLIENTE
  // Como tu modelo 'Interaction' aún no tiene campos de telefonía avanzados,
  // adaptamos la información que SÍ tienes y dejamos valores por defecto en los demás.
  const formattedLogs = rawInteractions.map((interaction) => ({
    id: interaction.id.slice(-6).toUpperCase(), // Acortamos el CUID para que parezca folio (ej. Q3F9A1)
    type: 'saliente', // Tu DB no especifica entrante/saliente aún
    
    // 🔥 FIX 1: Protección contra empleado nulo
    agent: interaction.employee?.name || '🤖 SISTEMA', 
    
    // 🔥 FIX 2: Protección contra usuario nulo
    client: interaction.user?.name || 'Cliente sin nombre',
    company: (interaction.user as any)?.rfc || 'Sin Empresa', // Usamos el RFC u otro campo temporalmente
    
    duration: "00:00", // No tienes columna de duración en tu DB
    status: "contestada", // No tienes status de éxito/falla de llamada en tu DB
    date: new Intl.DateTimeFormat('es-MX', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    }).format(interaction.date),
    fabric: null, // El producto está en Deal o OrderItem, no en Interaction directamente
    // audioUrl: undefined // Hasta que agregues esta columna en tu schema
  }));

  return (
    <LlamadasClient initialData={formattedLogs} />
  );
}