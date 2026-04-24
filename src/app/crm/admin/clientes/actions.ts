"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs"; // Asegúrate de tenerlo instalado

export async function registrarClienteAction(formData: any) {
  try {
    // 1. Verificar si el correo ya existe
    const existe = await prisma.user.findUnique({
      where: { email: formData.email }
    });

    if (existe) {
      return { success: false, error: "El correo electrónico ya está registrado." };
    }

    // 2. Hash de contraseña temporal (puedes enviar esto por correo al cliente)
    const hashedPassword = await bcrypt.hash("Coyote2026!", 10);

    // 3. Crear el cliente en la BD
    const nuevoCliente = await prisma.user.create({
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        password: hashedPassword,
        role: "USER",
        rfc: formData.rfc,
        street: formData.street,
        neighborhood: formData.neighborhood,
        zipCode: formData.zipCode,
        city: formData.city,
        state: formData.state,
        notes: formData.notes,
        membershipTier: "NONE",
      }
    });

    // 4. Auditoría
    await prisma.auditLog.create({
      data: {
        action: "CREATE_USER_MANUAL",
        resourceId: nuevoCliente.id,
        metadata: {
          summary: `Admin creó nuevo cliente: ${nuevoCliente.name}`,
          email: nuevoCliente.email
        }
      }
    });

    revalidatePath("/crm/admin/clientes");
    return { success: true, id: nuevoCliente.id };

  } catch (error: any) {
    console.error("Error al registrar cliente:", error);
    return { success: false, error: "Error interno al guardar en la base de datos." };
  }
}