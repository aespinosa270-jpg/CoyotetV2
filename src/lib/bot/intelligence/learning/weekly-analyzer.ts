/**
 * Weekly Analyzer — recopila datos de la semana y le pide a GPT-4o que
 * detecte patrones y proponga reglas nuevas para el bot.
 *
 * Output: WeeklyAnalysis con reglas estructuradas listas para inyectar
 * al system prompt vía learned-rules-block.
 */
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { getRedis } from "../../repositories/redis";
import {
  countEventsForDay,
  getRecentEvents,
} from "../../observability/events";
import {
  addLearnedRules,
  addAnalysis,
  type WeeklyAnalysis,
} from "./rules-repo";
import { getLogger } from "../../observability/logger";
import { recordEvent } from "../../observability/events";

const log = getLogger({ module: "intelligence/learning/weekly-analyzer" });

interface WeeklyData {
  semana: string;
  mensajesTotal: number;
  conversionesTotal: number;
  errorsTotal: number;
  hallucinationsTotal: number;
  ventasTotal: number;
  ordenesTotal: number;
  escalacionesPorRazon: Record<string, number>;
  topObjeciones: Array<{ tipo: string; count: number }>;
  telasNoManejadas: Array<{ tela: string; count: number }>;
  ratioConversion: number;
}

async function recopilarDatosSemana(): Promise<WeeklyData> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - 7);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Eventos Redis: sumar 7 días
  let mensajesTotal = 0;
  let conversionesTotal = 0;
  let errorsTotal = 0;
  let hallucinationsTotal = 0;
  const objCounts: Record<string, number> = {};

  for (let d = 0; d < 7; d++) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() - d);
    const [msg, conv, err, hal, objs] = await Promise.all([
      countEventsForDay("message", day),
      countEventsForDay("conversion", day),
      countEventsForDay("error", day),
      countEventsForDay("hallucination", day),
      getRecentEvents("objection", day, 200),
    ]);
    mensajesTotal += msg;
    conversionesTotal += conv;
    errorsTotal += err;
    hallucinationsTotal += hal;
    for (const ev of objs) {
      const tipo = (ev.data?.tipo as string) || (ev.data?.objecion as string) || "otra";
      objCounts[tipo] = (objCounts[tipo] || 0) + 1;
    }
  }

  // Prisma: ventas + escalaciones + telas no manejadas
  const [ventas, escalaciones, telasNM] = await Promise.all([
    prisma.order.aggregate({
      where: {
        source: "bot_v2",
        status: { in: ["PAID", "DELIVERED"] },
        createdAt: { gte: weekStart },
      },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.botEscalation.groupBy({
      by: ["razon"],
      where: { createdAt: { gte: weekStart } },
      _count: { razon: true },
    }),
    prisma.telaNoManejada.groupBy({
      by: ["telaIdentificada"],
      where: { createdAt: { gte: weekStart } },
      _count: true,
      orderBy: { _count: { telaIdentificada: "desc" } },
      take: 5,
    }),
  ]);

  const escPorRazon: Record<string, number> = {};
  for (const e of escalaciones) {
    escPorRazon[e.razon] = e._count.razon;
  }

  const topObjeciones = Object.entries(objCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tipo, count]) => ({ tipo, count }));

  const telasNoManejadas = telasNM.map((t: any) => ({
    tela: t.telaIdentificada,
    count: t._count,
  }));

  const semanaFmt = `${weekStart.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  })} - ${now.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}`;

  return {
    semana: semanaFmt,
    mensajesTotal,
    conversionesTotal,
    errorsTotal,
    hallucinationsTotal,
    ventasTotal: ventas._sum.total || 0,
    ordenesTotal: ventas._count.id,
    escalacionesPorRazon: escPorRazon,
    topObjeciones,
    telasNoManejadas,
    ratioConversion: mensajesTotal > 0
      ? Math.round((conversionesTotal / mensajesTotal) * 100)
      : 0,
  };
}

async function analizarConGPT(data: WeeklyData): Promise<{
  resumen: string;
  patrones: string[];
  reglas: Array<{ regla: string; evidencia: string }>;
} | null> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Eres el Aprendiz del Coyote Bot. Tu objetivo: analizar la semana de operación del bot y proponer reglas nuevas para mejorarlo.

DATOS DE LA SEMANA (${data.semana}):
- Mensajes procesados: ${data.mensajesTotal}
- Conversiones generadas: ${data.conversionesTotal}
- Ratio conversión: ${data.ratioConversion}%
- Órdenes pagadas: ${data.ordenesTotal} ($${data.ventasTotal.toLocaleString("es-MX")} MXN)
- Errores en producción: ${data.errorsTotal}
- Hallucinations cachadas: ${data.hallucinationsTotal}

ESCALACIONES POR RAZÓN:
${Object.entries(data.escalacionesPorRazon).map(([r, c]) => `- ${r}: ${c}`).join("\n") || "Sin escalaciones"}

TOP 5 OBJECIONES DEL CLIENTE:
${data.topObjeciones.map((o) => `- ${o.tipo}: ${o.count} veces`).join("\n") || "Sin objeciones"}

TOP 5 TELAS QUE PIDEN Y NO MANEJAMOS:
${data.telasNoManejadas.map((t) => `- ${t.tela}: ${t.count} solicitudes`).join("\n") || "Ninguna"}

TU TAREA:
1. Resume la semana en 3-4 líneas (qué funcionó, qué no, ratio)
2. Identifica 3-5 patrones claros
3. Propone REGLAS NUEVAS y ESPECÍFICAS (máximo 5) en formato "SI [condición] → ENTONCES [comportamiento]". Las reglas deben ser ACCIONABLES y NO genéricas.

EJEMPLOS DE REGLAS BUENAS:
- "SI cliente pide tergal por 3era vez en la semana → considerar agregar al catálogo, mientras tanto ofrecer Sportok como alternativa con más énfasis"
- "SI objeción precio_alto >50 veces en semana → enfatizar valor por kg (rendimiento) al inicio en lugar de cifras brutas"

EJEMPLOS DE REGLAS MALAS (NO USES):
- "SI cliente está enojado → atenderlo mejor" (genérico)
- "SI hay objeciones → resolverlas" (vago)

RESPONDE EN JSON ESTRICTO:
{
  "resumen": "string",
  "patrones": ["patrón 1", "patrón 2"],
  "reglas": [
    {"regla": "SI X → ENTONCES Y", "evidencia": "qué dato de la semana motivó esta regla"}
  ]
}

SOLO el JSON, sin markdown ni explicación adicional.`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      resumen: parsed.resumen || "",
      patrones: Array.isArray(parsed.patrones) ? parsed.patrones : [],
      reglas: Array.isArray(parsed.reglas) ? parsed.reglas : [],
    };
  } catch (err) {
    log.error({ err }, "Error llamando GPT para análisis semanal");
    return null;
  }
}

export async function runWeeklyLearningJob(): Promise<{
  ok: boolean;
  reglasAgregadas: number;
  resumen?: string;
  error?: string;
}> {
  try {
    log.info("🧠 Iniciando análisis semanal...");

    const data = await recopilarDatosSemana();
    log.info({ data: { ...data, semana: data.semana } }, "Datos recopilados");

    if (data.mensajesTotal < 10) {
      log.warn("Pocos datos en la semana — análisis saltado");
      return { ok: true, reglasAgregadas: 0, resumen: "Pocos datos para análisis" };
    }

    const analysis = await analizarConGPT(data);
    if (!analysis) {
      return { ok: false, reglasAgregadas: 0, error: "GPT no respondió" };
    }

    // Guardar reglas nuevas
    const nuevasReglas = analysis.reglas.map((r) => ({
      semana: data.semana,
      regla: r.regla,
      evidencia: r.evidencia,
    }));

    const allRules = await addLearnedRules(nuevasReglas);

    // Guardar análisis en historial
    const analysisRecord: WeeklyAnalysis = {
      id: `analysis-${Date.now()}`,
      semana: data.semana,
      fechaAnalisis: new Date().toISOString(),
      resumen: analysis.resumen,
      patrones: analysis.patrones,
      reglasGeneradas: nuevasReglas.map((_, i) => `rule-${Date.now()}-${i}`),
      kpis: {
        mensajes: data.mensajesTotal,
        ventas: data.ventasTotal,
        escalaciones: Object.values(data.escalacionesPorRazon).reduce((a, b) => a + b, 0),
        objecionesTotales: data.topObjeciones.reduce((a, b) => a + b.count, 0),
      },
    };
    await addAnalysis(analysisRecord);

    await recordEvent({
      type: "rag_used",
      data: {
        evento_real: "weekly_learning",
        reglasNuevas: nuevasReglas.length,
        totalReglas: allRules.length,
        semana: data.semana,
      },
    });

    log.info(
      { reglasNuevas: nuevasReglas.length, totalReglas: allRules.length },
      "✅ Análisis semanal completado"
    );

    return {
      ok: true,
      reglasAgregadas: nuevasReglas.length,
      resumen: analysis.resumen,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err: msg }, "Error en weekly learning");
    return { ok: false, reglasAgregadas: 0, error: msg };
  }
}