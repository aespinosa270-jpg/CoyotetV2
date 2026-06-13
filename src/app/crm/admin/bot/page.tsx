/**
 * Dashboard del Bot — server: carga datos reales y los pasa al client board.
 */
import { getDashboardMetrics } from "@/lib/bot/repositories/admin-queries";
import { getOrderStats } from "@/lib/bot/repositories/order-stats";
import { getChartsData } from "@/lib/bot/repositories/executive-dashboard";
import DashboardBoard from "./_components/DashboardBoard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BotDashboardPage() {
  const [metrics, orders, charts] = await Promise.all([
    getDashboardMetrics(),
    getOrderStats(),
    getChartsData().catch(() => null),
  ]);

  const salesByDay = (charts?.salesByDay ?? []).map((d) => ({
    date: d.date, fullDate: d.fullDate, revenue: d.revenue, orders: d.orders,
  }));

  return (
    <DashboardBoard
      metrics={JSON.parse(JSON.stringify(metrics))}
      orders={orders}
      salesByDay={salesByDay}
    />
  );
}
