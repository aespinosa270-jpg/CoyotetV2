"use server";

import { prisma } from "@/lib/prisma";
import { EmployeeRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export type CreateEmployeeInput = {
  name:     string;
  email:    string;
  password: string;
  role:     EmployeeRole;
};

export type EmployeeResult =
  | { success: true;  employeeId: string }
  | { success: false; error: string };

export async function createEmployeeAction(
  input: CreateEmployeeInput
): Promise<EmployeeResult> {
  const { name, email, password, role } = input;

  if (!name?.trim())     return { success: false, error: "El nombre es obligatorio." };
  if (!email?.trim())    return { success: false, error: "El email es obligatorio." };
  if (!password?.trim()) return { success: false, error: "La contraseña es obligatoria." };
  if (password.length < 8) return { success: false, error: "Mínimo 8 caracteres." };

  // Email único
  const exists = await prisma.employee.findUnique({ where: { email } });
  if (exists) return { success: false, error: "Ya existe un agente con ese email." };

  try {
    const hashed = await bcrypt.hash(password, 12);
    const employee = await prisma.employee.create({
      data: { name, email, password: hashed, role },
    });
    revalidatePath("/crm/admin/agentes");
    return { success: true, employeeId: employee.id };
  } catch (err) {
    console.error("[createEmployeeAction]", err);
    return { success: false, error: "Error al crear el agente." };
  }
}