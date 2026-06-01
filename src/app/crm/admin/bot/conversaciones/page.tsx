/**
 * Inbox inmersivo de conversaciones del bot.
 * Carga todos los threads de golpe; el filtrado/busqueda es en cliente.
 * La UI (3 columnas + barra) vive en ConversacionesTable, que se renderiza
 * en modo full-screen (fixed inset-0) por encima de los menus.
 */
import { listConversaciones } from "@/lib/bot/repositories/admin-queries";
import { ConversacionesTable } from "../_components/ConversacionesTable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConversacionesPage() {
  const { items } = await listConversaciones({ offset: 0, limit: 10000 });

  return <ConversacionesTable items={items} />;
}
