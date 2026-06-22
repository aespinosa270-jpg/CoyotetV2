import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminLayoutClient from "./_components/AdminLayoutClient";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // En NextAuth v5, auth() reemplaza a getServerSession()
  const session = await auth();
  
  if (!session?.user?.email) redirect("/crm/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!employee) redirect("/crm/login");

  // CRM unificado: admin y vendedoras entran al MISMO /crm/admin.
  // El menu y el bloqueo por ruta (permisos.ts) deciden que ve cada rol.
  // Roles sin acceso al CRM se mandan al login.
  const ROLES_CRM = ["ADMIN", "SUPERVISOR", "VENDEDORA", "LOGISTICA", "CONTABILIDAD"];
  if (!ROLES_CRM.includes(employee.role)) {
    redirect("/crm/login");
  }

  const ticketsUrgentes = await prisma.ticket.count({
    where: { priority: "URGENTE", status: "ABIERTO" },
  });

  return (
    <AdminLayoutClient employee={employee} notifCount={ticketsUrgentes}>
      {children}
    </AdminLayoutClient>
  );
}
