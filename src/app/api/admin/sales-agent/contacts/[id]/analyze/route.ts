/**
 * POST /api/admin/sales-agent/contacts/[id]/analyze
 *
 * Genera análisis IA del contacto frío usando GPT-4o:
 *   - SITUACIÓN: lectura del estado actual (perfil, historial, momento)
 *   - ESTRATEGIA: enfoque táctico recomendado (tono, ángulo, urgencia)
 *   - MENSAJE: WhatsApp listo para enviar, en voz de Coyote
 *   - MENSAJES ALTERNATIVOS: 2 variantes (más suave / más directo)
 *
 * Cache 24h en Redis (no se re-analiza si nada cambió).
 * Query ?force=1 fuerza re-análisis ignorando cache.
 *
 * Cost: ~$0.005 por análisis (~2K tokens IO con GPT-4o).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../../bot/_lib/guard";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/bot/repositories/redis";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o";
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h

interface AnalysisResult {
  situacion: string;
  estrategia: string;
  mensaje: string;
  mensajesAlternativos: {
    suave: string;
    directo: string;
  };
  meta: {
    model: string;
    cached: boolean;
    generatedAt: string;
    costUSD?: number;
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin();
  if (guard) return guard;

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get("force") === "1";

  // Cargar contacto con TODO el contexto
  const contact = await prisma.contactoOutbound.findUnique({
    where: { id },
    include: {
      attempts: {
        orderBy: { sentAt: "desc" },
        take: 5,
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact no existe" }, { status: 404 });
  }

  // Cargar orders previas (mina de oro de info)
  const orders = contact.phone
    ? await prisma.order.findMany({
        where: { customerPhone: contact.phone },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          orderNumber: true,
          total: true,
          status: true,
          createdAt: true,
          items: {
            select: { title: true, quantity: true, unit: true },
          },
        },
      })
    : [];

  // Cache key
  const redis = getRedis();
  const cacheKey = `v2:sales-agent:analysis:${id}`;

  if (!force) {
    const cached = await redis.get<AnalysisResult>(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        meta: { ...cached.meta, cached: true },
      });
    }
  }

  // Construir prompt enriquecido
  const promptContext = buildContext(contact, orders);
  const systemPrompt = buildSystemPrompt();

  // Llamar GPT-4o
  let response;
  try {
    response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptContext },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });
  } catch (err: any) {
    console.error("OpenAI error:", err);
    return NextResponse.json(
      { error: `Fallo OpenAI: ${err.message ?? "unknown"}` },
      { status: 500 }
    );
  }

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    return NextResponse.json({ error: "OpenAI no devolvio contenido" }, { status: 500 });
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "OpenAI devolvio JSON invalido", raw },
      { status: 500 }
    );
  }

  // Validacion minima
  if (!parsed.situacion || !parsed.estrategia || !parsed.mensaje) {
    return NextResponse.json(
      { error: "Respuesta IA incompleta", parsed },
      { status: 500 }
    );
  }

  // Costo aproximado (GPT-4o: $2.50/M input, $10/M output)
  const usage = response.usage;
  const costUSD = usage
    ? (usage.prompt_tokens * 2.5 + usage.completion_tokens * 10) / 1_000_000
    : undefined;

  const result: AnalysisResult = {
    situacion: parsed.situacion,
    estrategia: parsed.estrategia,
    mensaje: parsed.mensaje,
    mensajesAlternativos: {
      suave: parsed.mensajesAlternativos?.suave ?? parsed.mensaje,
      directo: parsed.mensajesAlternativos?.directo ?? parsed.mensaje,
    },
    meta: {
      model: MODEL,
      cached: false,
      generatedAt: new Date().toISOString(),
      costUSD,
    },
  };

  // Guardar en cache
  await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });

  return NextResponse.json(result);
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Eres el ESTRATEGA del CRM Sales Agent de Coyote Textil.

Tu rol: analizar un contacto frío B2B (cliente o prospecto que dejó de comprar) y generar:
1. SITUACIÓN — lectura objetiva del estado actual del cliente
2. ESTRATEGIA — enfoque táctico recomendado para reactivarlo
3. MENSAJE — texto LISTO PARA ENVIAR por WhatsApp, en voz de Coyote
4. MENSAJES ALTERNATIVOS — dos variantes: una más suave, una más directa

CONTEXTO DEL NEGOCIO:
- Coyote Textil: venta B2B de telas en México (deportiva, escolar, sublimación).
- Cliente típico: dueño de marca, taller de uniformes, sublimador, manufacturero.
- Pedidos típicos: 50-500kg. VIPs piden 500-2000kg recurrente.
- Telas top: Sportok (deportiva), Apolo (uniforme), Felpa Polar (cobijas), Alaska (sublimación).
- Lead time real: 1-2 días hábiles para todo <=1 tonelada.
- Nunca prometemos descuentos en frío — la marca es premium-mid, NO compite por precio.

VOZ DE COYOTE (TONO):
- Directo, profesional, cálido pero NO empalagoso.
- Habla de tú, sin formalismos excesivos.
- 1-3 emojis máximo (🐺 al saludar, 🔥 para urgencia genuina).
- NUNCA inicia con "Espero que te encuentres bien" ni clichés vacíos.
- Brevedad: máximo 4-5 líneas WhatsApp.
- Termina con UNA pregunta clara que invite a responder.
- NUNCA menciona proveedores, sourcing, "voy a checar stock".

REGLAS DE ESTRATEGIA:
- Si el cliente ya compró antes (orders previas): usa SOCIAL PROOF y VOLUMEN HISTÓRICO ("vi que pediste X hace Y, ¿retomamos?").
- Si nunca compró pero mostró interés alto: usa URGENCIA SUAVE estacional/temporada.
- Si tiene tag "vip" o leadScore alto: NO ofrezcas descuento, ofrece PRIORIDAD/EXCLUSIVIDAD.
- Si última interacción tuvo objeción de precio: enfoca en VALOR (calidad/lead time/respaldo).
- Si fue ghosted hace >60 días: usa un ÁNGULO NUEVO (no repitas la misma propuesta).
- Para todos: la PREGUNTA FINAL debe ser SÍ/NO o de 1 paso, no abierta.

FORMATO DE RESPUESTA (JSON estricto):
{
  "situacion": "2-3 oraciones describiendo el estado actual del cliente. Específico, basado en datos.",
  "estrategia": "2-3 oraciones del enfoque táctico. Por qué este ángulo, qué evitar.",
  "mensaje": "Texto WhatsApp listo (máximo 4-5 líneas). En voz Coyote. Termina con pregunta clara.",
  "mensajesAlternativos": {
    "suave": "Versión más conservadora, menos urgencia.",
    "directo": "Versión más asertiva, urgencia genuina."
  }
}

RESPONDE SOLO JSON VÁLIDO. Sin markdown, sin texto extra fuera del JSON.`;
}

function buildContext(contact: any, orders: any[]): string {
  const parts: string[] = [];

  parts.push("=== CONTACTO A ANALIZAR ===");
  parts.push(`Phone: ${contact.phone}`);
  if (contact.nombre && !/^\d+$/.test(contact.nombre)) parts.push(`Nombre: ${contact.nombre}`);
  if (contact.empresa) parts.push(`Empresa: ${contact.empresa}`);
  parts.push(`Status actual: ${contact.status}`);
  parts.push(`Engagement score: ${contact.engagementScore}/100`);
  parts.push(`Reactivation priority: ${contact.reactivationPriority}/100`);
  parts.push(`Total intentos previos: ${contact.totalAttempts}`);
  parts.push(`Cliente respondió alguna vez: ${contact.clienteRespondio ? "SÍ" : "NO"}`);
  if (contact.coldReason) parts.push(`Razón de enfriamiento: ${contact.coldReason}`);
  if (contact.tags && contact.tags.length > 0) parts.push(`Tags: ${contact.tags.join(", ")}`);

  const diasDesdeContacto = contact.plantillaEnviadaAt
    ? Math.floor((Date.now() - new Date(contact.plantillaEnviadaAt).getTime()) / 86400000)
    : null;
  if (diasDesdeContacto !== null) {
    parts.push(`Días desde primer contacto: ${diasDesdeContacto}`);
  }

  if (contact.notas) {
    parts.push("\n=== CONTEXTO IA DEL BOT V2 (perfil enriquecido) ===");
    parts.push(contact.notas);
  }

  if (contact.attempts && contact.attempts.length > 0) {
    parts.push(`\n=== ÚLTIMOS ${contact.attempts.length} INTENTOS ===`);
    for (const a of contact.attempts) {
      const when = new Date(a.sentAt).toLocaleDateString("es-MX");
      parts.push(`[${when} · ${a.channel} · outcome:${a.outcome ?? "sin respuesta"}]`);
      parts.push(`  Mensaje: ${a.messageSent.substring(0, 200)}${a.messageSent.length > 200 ? "..." : ""}`);
      if (a.responseText) {
        parts.push(`  Respuesta cliente: ${a.responseText.substring(0, 200)}`);
      }
    }
  }

  if (contact.feedbacks && contact.feedbacks.length > 0) {
    parts.push("\n=== FEEDBACK DE VENDEDORAS ===");
    for (const f of contact.feedbacks) {
      parts.push(`[${f.category ?? "general"}] ${f.feedback}`);
    }
  }

  if (orders && orders.length > 0) {
    parts.push(`\n=== ÓRDENES PREVIAS (cliente que ya compró - MINA DE ORO) ===`);
    parts.push(`Total órdenes: ${orders.length}`);
    const totalSpent = orders.reduce((s: number, o: any) => s + o.total, 0);
    parts.push(`Total histórico gastado: $${totalSpent.toLocaleString("es-MX")} MXN`);
    for (const o of orders.slice(0, 5)) {
      const when = new Date(o.createdAt).toLocaleDateString("es-MX");
      const items = o.items.map((i: any) => `${i.quantity}${i.unit ?? ""} ${i.title}`).join(", ");
      parts.push(`[${when}] ${o.orderNumber} - $${o.total.toLocaleString("es-MX")} - ${items} - status:${o.status}`);
    }
  } else {
    parts.push("\n=== SIN ÓRDENES PREVIAS — Prospecto puro ===");
  }

  parts.push("\n=== TU TAREA ===");
  parts.push("Genera SITUACIÓN + ESTRATEGIA + MENSAJE (con 2 alternativas suave/directo) en JSON.");
  parts.push("El mensaje debe sentirse humano, escrito por Jack de Coyote, NO por un robot.");

  return parts.join("\n");
}