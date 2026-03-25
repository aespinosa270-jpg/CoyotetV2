import { getMisTickets } from "@/app/actions/tickets";
import MisTicketsClient from "./_components/MisTicketsClient";

export default async function TicketsPage() {
  const tickets = await getMisTickets();

  // Serializa Date → string para pasarlos como props a Client Component
  const serialized = tickets.map((t: any) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    user: t.user
      ? { ...t.user, name: t.user.name ?? t.user.email }
      : null,
    order: t.order ? { id: t.order.id, orderNumber: String(t.order.orderNumber) } : null,
  })) as any;

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden">
      <MisTicketsClient tickets={serialized} />
    </div>
  );
}