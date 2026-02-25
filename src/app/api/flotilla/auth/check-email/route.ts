import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    // Buscamos al empleado activo en el sistema de Coyote
    const employee = await prisma.employee.findFirst({
      where: { 
        email: email.toLowerCase(), 
        isActive: true 
      },
      select: { 
        id: true, 
        role: true,
        name: true 
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "No encontramos tu registro como chofer." }, { status: 404 });
    }

    // Filtro de Seguridad: Solo personal de LOGISTICA entra a la App de Flotilla
    if (employee.role !== "LOGISTICA") {
      return NextResponse.json({ error: "Acceso restringido a personal de logística." }, { status: 403 });
    }

    return NextResponse.json({ 
      ok: true, 
      name: employee.name 
    });

  } catch (err) {
    console.error("Error en check-email Coyote:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}