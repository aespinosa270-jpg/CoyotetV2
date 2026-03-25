import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ADMIN_EMAILS } from "@/lib/admin-emails";
import { auth } from "@/auth";

export default async function CRMRootPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { isActive: true },
  });

  if (!employee?.isActive) redirect("/login");

  if (ADMIN_EMAILS.includes(session.user.email)) {
    redirect("/crm/admin");
  }

  redirect("/crm/agente");
}