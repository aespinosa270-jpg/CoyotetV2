"use server";

import { prisma } from "@/lib/prisma";
import { EmployeeRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type AgentInput = {
  id?:             string;
  name:            string;
  email:           string;
  password?:       string; // Opcional en actualizaciones
  role:            EmployeeRole;
  commissionRate:  number;
  isActive?:       boolean;
};

export type AgentResult =
  | { success: true;  agentId: string }
  | { success: false; error: string };

// ─── QUERIES ────────────────────────────────────────────────────────────────

/**
 * Obtiene la fuerza de ventas completa con KPIs de rendimiento.
 * Cruza: Deals Ganados, Win Rate y Status de Asistencia.
 */
export async function getAgentsWithStats() {
  try {
    const agents = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        // Traemos deals para calcular el histórico
        deals: {
          select: { id: true, value: true, status: true },
        },
        // Traemos la última asistencia para saber si está online
        attendances: {
          where: {
            checkIn: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
          orderBy: { checkIn: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return agents.map((a) => {
      const ganados = a.deals.filter((d) => d.status === "CERRADO_GANADO");
      const perdidos = a.deals.filter((d) => d.status === "CERRADO_PERDIDO");
      
      const totalGanado = ganados.reduce((acc, d) => acc + Number(d.value), 0);
      const cerrados = ganados.length + perdidos.length;
      
      const lastAttendance = a.attendances[0] ?? null;
      const isOnline = lastAttendance != null && lastAttendance.checkOut == null;

      return {
        ...a,
        totalSales: totalGanado,
        dealsCount: a.deals.length,
        winRate: cerrados > 0 ? Math.round((ganados.length / cerrados) * 100) : 0,
        isOnline,
        lastCheckIn: lastAttendance?.checkIn?.toISOString() ?? null,
      };
    });
  } catch (err) {
    console.error("[getAgentsWithStats]", err);
    return [];
  }
}

/**
 * Detalle profundo de un agente para la vista de perfil
 */
export async function getAgentById(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      deals: {
        include: { product: true, user: true },
        orderBy: { updatedAt: "desc" }
      }
    }
  });
}

// ─── ACTIONS ─────────────────────────────────────────────────────────────────

/**
 * Crear o Actualizar Agente.
 * Integra el hashing de seguridad de tu lógica original.
 */
export async function upsertAgentAction(input: AgentInput): Promise<AgentResult> {
  const { id, name, email, password, role, commissionRate, isActive } = input;

  if (!name?.trim())  return { success: false, error: "El nombre es obligatorio." };
  if (!email?.trim()) return { success: false, error: "El email es obligatorio." };

  try {
    // ─── ESCENARIO: ACTUALIZACIÓN ───
    if (id) {
      const updateData: any = { 
        name, 
        email, 
        role, 
        commissionRate, 
        isActive: isActive ?? true 
      };

      // Solo hashear si el usuario escribió algo en el campo de password
      if (password && password.trim().length >= 8) {
        updateData.password = await bcrypt.hash(password, 12);
      } else if (password && password.trim().length > 0) {
        return { success: false, error: "La nueva contraseña debe tener mínimo 8 caracteres." };
      }

      const updated = await prisma.employee.update({
        where: { id },
        data: updateData
      });

      revalidatePath("/crm/admin/agentes");
      return { success: true, agentId: updated.id };
    }

    // ─── ESCENARIO: CREACIÓN ───
    if (!password || password.trim().length < 8) {
      return { success: false, error: "La contraseña es obligatoria (mín. 8 caracteres)." };
    }

    // Validar duplicados
    const exists = await prisma.employee.findUnique({ where: { email } });
    if (exists) return { success: false, error: "Este correo ya está registrado en la base de datos." };

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAgent = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        commissionRate,
        isActive: true
      }
    });

    revalidatePath("/crm/admin/agentes");
    return { success: true, agentId: newAgent.id };

  } catch (err: any) {
    console.error("[upsertAgentAction]", err);
    return { success: false, error: "Error fatal al procesar el agente en la base de datos." };
  }
}

/**
 * Baja de Agente (Soft Delete o Hard Delete según prefieras)
 * Por ahora lo borramos, pero podrías cambiarlo a isActive: false
 */
export async function deleteAgentAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.employee.delete({ where: { id } });
    revalidatePath("/crm/admin/agentes");
    return { success: true };
  } catch (err) {
    console.error("[deleteAgentAction]", err);
    return { success: false, error: "No se puede eliminar: el agente tiene historial de ventas." };
  }
}