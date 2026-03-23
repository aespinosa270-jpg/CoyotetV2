// src/lib/activity.ts
// Helper que llamas en cualquier route handler del CRM para mantener el status del agente

import { prisma } from "@/lib/prisma";

/**
 * Llama esto al inicio de cualquier route handler autenticado del CRM.
 * Actualiza lastActiveAt y pone al agente como "active".
 *
 * Uso:
 *   import { trackActivity } from "@/lib/activity"
 *   export async function GET(req: Request) {
 *     const session = await getServerSession(authOptions)
 *     if (session?.user.employeeId) await trackActivity(session.user.employeeId)
 *     // ... resto del handler
 *   }
 */
export async function trackActivity(employeeId: string) {
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        status: "active",
        lastActiveAt: new Date(),
      },
    });
  } catch {
    // No lanzamos el error — si falla el tracking no rompemos el request
  }
}


// ==========================================================
// src/app/api/cron/agent-status/route.ts
// Vercel Cron que marca idle/offline según inactividad
// Configura en vercel.json: { "crons": [{ "path": "/api/cron/agent-status", "schedule": "*/5 * * * *" }] }
// ==========================================================

import { NextResponse } from "next/server";

const IDLE_MINUTES    = 15;
const OFFLINE_MINUTES = 30;

export async function GET(req: Request) {
  // Protección básica: solo Vercel Cron puede llamar esto
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const idleCutoff    = new Date(now.getTime() - IDLE_MINUTES    * 60 * 1000);
  const offlineCutoff = new Date(now.getTime() - OFFLINE_MINUTES * 60 * 1000);

  // Marca offline a quien lleva más de 30 min sin actividad
  const wentOffline = await prisma.employee.updateMany({
    where: {
      isActive: true,
      status: { not: "offline" },
      lastActiveAt: { lt: offlineCutoff },
    },
    data: { status: "offline" },
  });

  // Marca idle a quien lleva entre 15 y 30 min sin actividad
  const wentIdle = await prisma.employee.updateMany({
    where: {
      isActive: true,
      status: "active",
      lastActiveAt: {
        gte: offlineCutoff,
        lt: idleCutoff,
      },
    },
    data: { status: "idle" },
  });

  return NextResponse.json({
    ok: true,
    wentOffline: wentOffline.count,
    wentIdle: wentIdle.count,
    timestamp: now.toISOString(),
  });
}