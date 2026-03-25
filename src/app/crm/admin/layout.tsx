import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import AdminLayoutClient from "./_components/AdminLayoutClient";
import { redirect } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  if (!ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/agente");
  }

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!employee) redirect("/login");

  const ticketsUrgentes = await prisma.ticket.count({
    where: { priority: "URGENTE", status: "ABIERTO" },
  });

  return (
    <AdminLayoutClient employee={employee} notifCount={ticketsUrgentes}>
      {children}
    </AdminLayoutClient>
  );
}