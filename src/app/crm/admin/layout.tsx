import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import AdminLayoutClient from "./_components/AdminLayoutClient";
import { redirect } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // En NextAuth v5, auth() reemplaza a getServerSession()
  const session = await auth();
  
  if (!session?.user?.email) redirect("/crm/login");

  if (!ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/agente");
  }

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!employee) redirect("/crm/login");

  const ticketsUrgentes = await prisma.ticket.count({
    where: { priority: "URGENTE", status: "ABIERTO" },
  });

  return (
    <AdminLayoutClient employee={employee} notifCount={ticketsUrgentes}>
      {children}
    </AdminLayoutClient>
  );
}
