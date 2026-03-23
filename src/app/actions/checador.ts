"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { BreakType } from "@prisma/client";

export async function checkInAction(employeeId: string, lat?: number, lng?: number, location?: string) {
  try {
    const attendance = await prisma.attendance.create({
      data: { 
        employeeId, 
        checkIn: new Date(),
        lat,          
        lng,          
        location      
      }
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: "active", lastActiveAt: new Date() }
    });

    revalidatePath("/crm/agente/checador");
    return { success: true, attendanceId: attendance.id, data: attendance };
  } catch (error) {
    console.error("[checkInAction]", error);
    return { success: false, error: "Error al registrar entrada." };
  }
}

export async function checkOutAction(attendanceId: string, employeeId: string, lat?: number, lng?: number) {
  try {
    const attendance = await prisma.attendance.findUnique({ 
      where: { id: attendanceId }, 
      include: { breaks: true } 
    });
    
    if (!attendance) throw new Error("Turno no encontrado.");

    // Cerramos cualquier pausa que se haya quedado abierta por accidente
    const openBreak = attendance.breaks.find(b => !b.endAt);
    if (openBreak) {
      await endBreakAction(openBreak.id);
    }

    const checkOutTime = new Date();
    // Horas trabajadas en formato decimal
    const horasTrabajadas = (checkOutTime.getTime() - attendance.checkIn.getTime()) / 3600000;

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { 
        checkOut: checkOutTime, 
        horasTrabajadas,
        checkOutLat: lat, 
        checkOutLng: lng  
      }
    });

    await prisma.employee.update({
      where: { id: employeeId },
      data: { status: "offline", lastActiveAt: new Date() }
    });

    revalidatePath("/crm/agente/checador");
    return { success: true, data: updated };
  } catch (error) {
    console.error("[checkOutAction]", error);
    return { success: false, error: "Error al registrar salida." };
  }
}

export async function startBreakAction(attendanceId: string, type: BreakType) {
  try {
    const newBreak = await prisma.attendanceBreak.create({
      data: { attendanceId, type }
    });
    
    revalidatePath("/crm/agente/checador");
    return { success: true, data: newBreak }; 
  } catch (error) {
    console.error("[startBreakAction]", error);
    return { success: false, error: "Error al iniciar pausa." };
  }
}

export async function endBreakAction(breakId: string) {
  try {
    const b = await prisma.attendanceBreak.findUnique({ where: { id: breakId } });
    if (!b) throw new Error("Pausa no encontrada");

    const endAt = new Date();
    // Duración de la pausa en minutos
    const duration = (endAt.getTime() - b.startAt.getTime()) / 60000; 

    const updatedBreak = await prisma.attendanceBreak.update({ 
      where: { id: breakId }, 
      data: { endAt, duration } 
    });
    
    revalidatePath("/crm/agente/checador");
    return { success: true, data: updatedBreak };
  } catch (error) {
    console.error("[endBreakAction]", error);
    return { success: false, error: "Error al terminar pausa." };
  }
}