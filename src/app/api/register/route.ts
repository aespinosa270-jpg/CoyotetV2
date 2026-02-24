import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma"; // 👈 Asegúrate de que los import con llaves {} estén correctos

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = body;

    // 1. Validar que no nos manden datos vacíos
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Faltan datos obligatorios (Nombre, correo o contraseña)" }, 
        { status: 400 }
      );
    }

    // 2. Verificar si el usuario ya existe en Supabase
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "Este correo ya está registrado. Por favor, inicia sesión." }, 
        { status: 409 } // 409 Conflict
      );
    }

    // 3. Encriptar la contraseña (NUNCA guardar texto plano)
    const hashedPassword = await hash(password, 10);

    // 4. Crear el usuario en Prisma / Supabase
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        // Al crearse, tomará el rol "USER" y la membresía "NONE" por defecto gracias a tu schema
      }
    });

    // 5. Devolver éxito sin mandar la contraseña de regreso por seguridad
    return NextResponse.json(
      { 
        message: "¡Usuario creado exitosamente!", 
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        }
      }, 
      { status: 201 }
    );

  } catch (error) {
    console.error("Error crítico en el registro:", error);
    return NextResponse.json(
      { message: "Error interno del servidor al crear la cuenta." }, 
      { status: 500 }
    );
  }
}