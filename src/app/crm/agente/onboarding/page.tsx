import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import OnboardingClient from "./_components/OnboardingClient";

async function getOnboardingData(employeeId: string) {
  const [productos, recientes] = await Promise.all([
    prisma.product.findMany({
      where:   { isActive: true },
      select:  { id: true, title: true, sku: true, priceMayoreo: true, category: true },
      orderBy: { title: "asc" },
    }),
    prisma.deal.findMany({
      where:   { employeeId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, company: true } },
        product: { select: { title: true, sku: true } },
      },
      orderBy: { createdAt: "desc" },
      take:    10,
    }),
  ]);

  return {
    productos,
    recientes: recientes.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      user: d.user
        ? { ...d.user, name: d.user.name ?? d.user.email }
        : null,
    })),
  };
}

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where:  { email: session.user.email },
    select: { id: true, name: true },
  });
  if (!employee) redirect("/login");

  const { productos, recientes } = await getOnboardingData(employee.id);

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <div className="shrink-0">
        <p className="text-[9px] tracking-[0.3em] text-zinc-500 uppercase mb-0.5">Mi CRM / Registro</p>
        <h1 className="text-2xl font-black uppercase tracking-tighter text-white italic">
          Onboarding <span className="text-[#FDCB02]">Cliente</span>
        </h1>
      </div>
      <OnboardingClient
        productos={productos}
        recientes={recientes}
        employeeId={employee.id}
      />
    </div>
  );
}