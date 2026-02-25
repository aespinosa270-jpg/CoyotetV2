import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  
  // Eliminamos la cookie de la sesión de flotilla
  cookieStore.delete("flotilla-session");

  return NextResponse.json({ 
    ok: true, 
    message: "Jornada finalizada exitosamente." 
  });
}