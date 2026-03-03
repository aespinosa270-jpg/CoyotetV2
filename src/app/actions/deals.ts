"use server"

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Función para obtener todos los pedidos del Pipeline
export async function getDeals() {
  try {
    const deals = await prisma.deal.findMany({
      include: {
        agent: true // Traemos también los datos del agente responsable
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return deals;
  } catch (error) {
    console.error("Error obteniendo deals:", error)
    throw new Error("No se pudo cargar el pipeline")
  }
}

// Función para mover un pedido de columna (Drag & Drop real)
export async function updateDealStage(dealId: string, newStage: string) {
  const updatedDeal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: newStage }
  })
  return updatedDeal;
}