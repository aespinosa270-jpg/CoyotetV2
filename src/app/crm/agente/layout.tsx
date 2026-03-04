import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AgentLayoutClient from "./_components/AgentLayoutClient";
import { ADMIN_EMAILS } from "@/lib/admin-emails";

export default async function AgentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  if (ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/admin");
  }

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!employee) redirect("/login");

  const misTicketsPendientes = await prisma.ticket.count({
    where: {
      employeeId: employee.id,
      status:     { in: ["ABIERTO", "EN_REVISION"] },
    },
  });

  return (
    <AgentLayoutClient employee={employee} notifCount={misTicketsPendientes}>
      {children}
    </AgentLayoutClient>
  );
}