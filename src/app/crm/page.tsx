import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function CRMRootPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { isActive: true },
  });

  if (!employee?.isActive) redirect("/login");

  // CRM unificado: todos los empleados activos entran al mismo /crm/admin.
  // El menu y permisos.ts deciden que ve cada rol.
  redirect("/crm/admin");
}