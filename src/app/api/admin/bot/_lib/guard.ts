/**
 * Helper de autorización para los endpoints admin del bot.
 *
 * Usa NextAuth v5 + ADMIN_EMAILS, igual que el layout de /crm/admin/.
 * Si el caller no es admin, retorna NextResponse 401 o 403 listo para devolver.
 *
 * Uso:
 *   export async function POST(req: NextRequest) {
 *     const guard = await requireAdmin();
 *     if (guard) return guard;
 *     // ... lógica de admin
 *   }
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}
