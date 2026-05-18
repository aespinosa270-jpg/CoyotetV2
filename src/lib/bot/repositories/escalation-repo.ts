/**
 * Repositorio CRUD de escalaciones contra Prisma.
 *
 * También maneja el lock anti-duplicado: si ya existe una escalación pendiente
 * para un teléfono en los últimos 30 minutos, NO crea otra.
 */
import { prisma } from "@/lib/prisma";
import type { EscalationInput, RazonEscalacion } from "../domain/escalation/types";
import { getLogger } from "../observability/logger";

const log = getLogger({ module: "escalation-repo" });

const DUPLICATE_WINDOW_MIN = 30;

export interface BotEscalation {
  id: string;
  phone: string;
  nombre: string | null;
  razon: string;
  contexto: string;
  ultimoMsg: string;
  estado: string;
  atendidaPor: string | null;
  atendidaAt: Date | null;
  createdAt: Date;
}

/**
 * Crea escalación. Si ya hay una pendiente reciente para este phone, no crea
 * otra y devuelve la existente (idempotencia).
 */
export async function createEscalation(
  input: EscalationInput
): Promise<BotEscalation | null> {
  const cutoff = new Date(Date.now() - DUPLICATE_WINDOW_MIN * 60_000);
  const existing = await (prisma as any).botEscalation.findFirst({
    where: {
      phone: input.phone,
      estado: "pendiente",
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    log.info(
      { phone: input.phone, existingId: existing.id },
      "Escalación duplicada evitada (ya hay pendiente reciente)"
    );
    return existing;
  }

  try {
    const created = await (prisma as any).botEscalation.create({
      data: {
        phone: input.phone,
        nombre: input.nombre ?? null,
        razon: input.razon,
        contexto: input.contexto,
        ultimoMsg: input.ultimoMsg,
        estado: "pendiente",
      },
    });
    log.info({ id: created.id, phone: input.phone, razon: input.razon }, "Escalación creada");
    return created;
  } catch (err) {
    log.error({ err, phone: input.phone }, "Error creando escalación");
    return null;
  }
}

export async function listEscalations(filters: {
  estado?: string;
  razon?: RazonEscalacion;
  take?: number;
}): Promise<BotEscalation[]> {
  return (prisma as any).botEscalation.findMany({
    where: {
      ...(filters.estado ? { estado: filters.estado } : {}),
      ...(filters.razon ? { razon: filters.razon } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 200,
  });
}

export async function getEscalation(id: string): Promise<BotEscalation | null> {
  return (prisma as any).botEscalation.findUnique({ where: { id } });
}

export async function marcarAtendida(
  id: string,
  adminEmail: string
): Promise<BotEscalation | null> {
  try {
    return await (prisma as any).botEscalation.update({
      where: { id },
      data: {
        estado: "atendida",
        atendidaPor: adminEmail,
        atendidaAt: new Date(),
      },
    });
  } catch (err) {
    log.error({ err, id }, "Error marcando atendida");
    return null;
  }
}

export async function marcarDescartada(
  id: string,
  adminEmail: string
): Promise<BotEscalation | null> {
  try {
    return await (prisma as any).botEscalation.update({
      where: { id },
      data: {
        estado: "descartada",
        atendidaPor: adminEmail,
        atendidaAt: new Date(),
      },
    });
  } catch (err) {
    log.error({ err, id }, "Error marcando descartada");
    return null;
  }
}

export async function getEscalationStats(): Promise<{
  pendientes: number;
  atendidas: number;
  descartadas: number;
  porRazon: Record<string, number>;
}> {
  const [pendientes, atendidas, descartadas, byRazon] = await Promise.all([
    (prisma as any).botEscalation.count({ where: { estado: "pendiente" } }),
    (prisma as any).botEscalation.count({ where: { estado: "atendida" } }),
    (prisma as any).botEscalation.count({ where: { estado: "descartada" } }),
    (prisma as any).botEscalation.groupBy({
      by: ["razon"],
      where: { estado: "pendiente" },
      _count: { razon: true },
    }) as any,
  ]);

  const porRazon: Record<string, number> = {};
  for (const row of byRazon) {
    porRazon[row.razon] = row._count.razon;
  }

  return { pendientes, atendidas, descartadas, porRazon };
}
