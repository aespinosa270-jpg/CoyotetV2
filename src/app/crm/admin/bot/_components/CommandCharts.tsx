"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ChartsData } from "@/lib/bot/repositories/executive-dashboard";

function formatMxn(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function CommandCharts({ data }: { data: ChartsData }) {
  const totalRevenue30d = data.salesByDay.reduce((a, b) => a + b.revenue, 0);
  const totalOrders30d = data.salesByDay.reduce((a, b) => a + b.orders, 0);
  const totalMessages30d = data.activityByDay.reduce((a, b) => a + b.messages, 0);
  const totalConversions30d = data.activityByDay.reduce((a, b) => a + b.conversions, 0);
  const totalErrors7d = data.healthLast7Days.reduce((a, b) => a + b.errors, 0);
  const totalHallucinations7d = data.healthLast7Days.reduce(
    (a, b) => a + b.hallucinations,
    0
  );

  return (
    <div className="space-y-6 mt-8 pt-8 border-t-2 border-blue-300">
      <div className="flex items-center gap-3">
        <span className="text-2xl">📈</span>
        <h2 className="text-xl font-bold text-neutral-900">Tendencias temporales</h2>
        <span className="ml-auto text-xs text-neutral-500">
          Últimos 30 días · Bot V2
        </span>
      </div>

      {/* GRÁFICA 1: Ventas por día */}
      <section className="rounded-xl border border-emerald-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase text-emerald-800">
            💰 Ventas últimos 30 días
          </h3>
          <div className="text-xs text-neutral-600">
            Total: <strong className="text-emerald-700">${totalRevenue30d.toLocaleString("es-MX")}</strong>
            {" · "}
            <strong>{totalOrders30d}</strong> órdenes
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.salesByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#666" }} interval={3} />
            <YAxis
              tick={{ fontSize: 11, fill: "#666" }}
              tickFormatter={formatMxn}
            />
            <Tooltip
              labelFormatter={(label) => `Día: ${label}`}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              name="Ventas ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* GRÁFICA 2: Actividad del bot (mensajes + conversiones) */}
      <section className="rounded-xl border border-purple-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase text-purple-800">
            💬 Actividad del bot (últimos 30 días)
          </h3>
          <div className="text-xs text-neutral-600">
            <strong>{totalMessages30d}</strong> mensajes ·{" "}
            <strong className="text-purple-700">{totalConversions30d}</strong> conversiones
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data.activityByDay} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#666" }} interval={3} />
            <YAxis tick={{ fontSize: 11, fill: "#666" }} />
            <Tooltip
              labelFormatter={(label) => `Día: ${label}`}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="messages"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Mensajes"
            />
            <Line
              type="monotone"
              dataKey="conversions"
              stroke="#ec4899"
              strokeWidth={2}
              dot={{ r: 2 }}
              name="Conversiones"
            />
          </LineChart>
        </ResponsiveContainer>
      </section>

      {/* GRÁFICA 3: Salud del bot (errores + alucinaciones, últimos 7d) */}
      <section className="rounded-xl border border-red-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold uppercase text-red-800">
            🚨 Salud del bot (últimos 7 días)
          </h3>
          <div className="text-xs text-neutral-600">
            <strong className={totalErrors7d > 10 ? "text-red-700" : ""}>
              {totalErrors7d}
            </strong> errores ·{" "}
            <strong className={totalHallucinations7d > 5 ? "text-red-700" : ""}>
              {totalHallucinations7d}
            </strong> alucinaciones
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.healthLast7Days} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#666" }} />
            <YAxis tick={{ fontSize: 11, fill: "#666" }} allowDecimals={false} />
            <Tooltip
              labelFormatter={(label) => `Día: ${label}`}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="errors" fill="#ef4444" name="Errores" radius={[4, 4, 0, 0]} />
            <Bar dataKey="hallucinations" fill="#f97316" name="Alucinaciones" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {totalErrors7d === 0 && totalHallucinations7d === 0 && (
          <p className="text-center text-xs text-emerald-700 mt-2 italic">
            ✓ Bot estable: sin errores ni alucinaciones esta semana
          </p>
        )}
      </section>
    </div>
  );
}