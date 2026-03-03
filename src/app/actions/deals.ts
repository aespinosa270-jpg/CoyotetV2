"use server"

import { prisma } from '@/lib/prisma'
import { PipelineStatus } from '@prisma/client' // Importamos tu Enum real
import { revalidatePath } from 'next/cache'

// Función para obtener todos los pedidos del Pipeline con TODA su información
export async function getDeals() {
  try {
    // Adiós al "any". Prisma ahora sabe exactamente qué es un "deal".
    const deals = await prisma.deal.findMany({
      include: {
        employee: true, // Trae los datos de la vendedora (Valeria, Paula, Katia)
        user: true,     // Trae los datos del cliente (si existe)
        product: true   // Trae los datos de la tela (Diablo, Sportok, etc.)
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return deals;
  } catch (error) {
    console.error("Error obteniendo deals:", error)
    throw new Error("No se pudo cargar el pipeline de Supabase")
  }
}

// Función para mover un pedido de columna (Drag & Drop real)
export async function updateDealStatus(dealId: string, newStatus: PipelineStatus) {
  try {
    const updatedDeal = await prisma.deal.update({
      where: { id: dealId },
      // Cambiamos "stage" por "status", que es como lo tienes en el schema
      data: { status: newStatus } 
    })
    
    // Limpiamos el caché para que el Kanban se actualice al instante para todos
    revalidatePath('/crm/admin/pipeline');
    
    return updatedDeal;
  } catch (error) {
    console.error("Error moviendo el deal:", error)
    throw new Error("Fallo al actualizar la etapa del trato")
  }
}