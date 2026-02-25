import { PrismaClient } from "@prisma/client"

// 1. Añade un sufijo aleatorio a la variable global para forzar
// a Node a crear un nuevo espacio en memoria, ignorando el viejo.
const globalForPrisma = global as unknown as { prisma_v2: PrismaClient }

export const prisma =
  globalForPrisma.prisma_v2 ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma_v2 = prisma