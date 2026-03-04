import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import AdminLayoutClient from "./_components/AdminLayoutClient";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  // Cargar empleado real en sesión
  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  // Tickets urgentes sin asignar — para el badge de notificaciones
  const ticketsUrgentes = await prisma.ticket.count({
    where: { priority: "URGENTE", status: "ABIERTO" },
  });

  return (
    <AdminLayoutClient
      employee={employee}
      notifCount={ticketsUrgentes}
    >
      {children}
    </AdminLayoutClient>
  );
}