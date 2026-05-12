import { getLogger } from "../observability/logger";
import { getRedis } from "../repositories/redis";
import * as clientRepo from "../repositories/client-repo";
import * as conversationRepo from "../repositories/conversation-repo";
import { buildSystemPrompt } from "../intelligence/prompts/builder";
import { chat } from "../services/openai/chat";
import { BOT_TOOLS } from "../tools/definitions";
import { executeTool } from "../tools/executor";
import { firstCp } from "../domain/extractors/postal-code";
import {
  buildCorrectiveMessage,
  validateBotResponse,
} from "../postprocessing/product-validator";
// ── FASE 5: intelligence ───────────────────────────────────────────
import { extractObjecion } from "../intelligence/objections/extractor";
import {
  decayObjeciones,
  trackObjecion,
} from "../intelligence/objections/tracker";
import { esTonoPositivo } from "../domain/sales/signals";
import { regenerateSummary } from "../intelligence/summary/regenerator";
import { extractHechosEpisodicos } from "../intelligence/memory/extractor";
import { mergeHechos } from "../intelligence/memory/merger";
import {
  getMemoria,
  saveMemoria,
} from "../repositories/memory-repo";
import type { ObjecionDetectada } from "../intelligence/objections/types";
import type { HechoEpisodico } from "../intelligence/memory/types";
// ── FASE 7: vision ─────────────────────────────────────────────────
import { analyzeIncomingImage } from "../intelligence/vision/analyzer";
// ── Tipos ──────────────────────────────────────────────────────────
import type { IncomingMessage, OutgoingMessage } from "../types/messages";
import type { BotContext } from "./types";

const log = getLogger({ module: "orchestrator" });

const INTELLIGENCE_TIMEOUT_MS = 8_000;

export async function processMessage(
  message: IncomingMessage
): Promise<OutgoingMessage[]> {
  const redis = getRedis();
  const phone = message.from.id;

  try {
    let profile = await clientRepo.findOrCreate(phone, redis);

    // ── 1. FASE 7: si es imagen, analizar y enriquecer userText ──
    let userText = message.text || "";

    if (message.type === "image" && message.media) {
      log.info({ phone }, "Mensaje tipo imagen recibido, analizando con vision");
      try {
        const visionResult = await analyzeIncomingImage(message, { redis });
        userText = visionResult.enrichedUserMessage;
        log.info(
          {
            phone,
            esProducto: visionResult.analysis.esProducto,
            tipoTela: visionResult.analysis.tipoTela,
            fromCache: visionResult.fromCache,
            confianza: visionResult.analysis.confianza,
          },
          "Imagen analizada"
        );
      } catch (err) {
        log.error({ err, phone }, "Vision pipeline falló, continuando con caption");
        userText = message.media.caption
          ? `[Cliente mandó imagen pero no pudimos analizarla] Texto que escribió: "${message.media.caption}"`
          : "[Cliente mandó imagen pero no pudimos analizarla. Pregunta amablemente qué necesita.]";
      }
    }

    // ── 2. Auto-extraer CP si vino texto del cliente ──
    const cpDetectado = firstCp(message.text || "");
    if (cpDetectado && (profile as any).codigoPostalEnvio !== cpDetectado) {
      profile = (await clientRepo.update(
        phone,
        { codigoPostalEnvio: cpDetectado } as any,
        redis
      )) as any;
      log.info({ phone, cp: cpDetectado }, "CP autodetectado del mensaje");
    }

    const history = await conversationRepo.getHistorial(phone, redis);
    const isAdmin = userText.trim().toLowerCase() === "elcoyote56";

    const context: BotContext = {
      message,
      redis,
      profile,
      history,
      isAdmin,
      state: { shouldAbort: false },
    };

    // ── 3. FASE 5: extractor de objeciones en paralelo ──
    // OJO: solo si hay texto real del cliente; las imágenes no aportan objeción
    // verbalizada. Si fue solo imagen, lo dejamos como "ninguna".
    const hasRealUserText = (message.text || "").trim().length > 0;
    const objecionPromise =
      isAdmin || !hasRealUserText
        ? Promise.resolve<ObjecionDetectada>({
            tipo: "ninguna",
            severidad: 1,
            contexto: "",
          })
        : extractObjecion(message.text!).catch((err) => {
            log.warn({ err, phone }, "Extractor de objeciones falló");
            return {
              tipo: "ninguna" as const,
              severidad: 1 as const,
              contexto: "",
            };
          });

    // ── 4. System prompt con RAG (Fase 6) + memoria/objeciones (Fase 5) ──
    const systemContent = await buildSystemPrompt(profile, isAdmin, {
      redis,
      userMessage: userText,
    });
    const apiMessages: any[] = [
      { role: "system", content: systemContent },
      ...history,
      { role: "user", content: userText },
    ];

    // ── 5. Round 1 ──
    let response = await chat(apiMessages, { tools: BOT_TOOLS as any });
    let finalTexto = response.text;

    // ── 6. Tool calling loop ──
    if (response.toolCalls && response.toolCalls.length > 0) {
      apiMessages.push({
        role: "assistant",
        content: response.text || null,
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments),
          },
        })),
      });

      for (const call of response.toolCalls) {
        const result = await executeTool(call as any, context);
        apiMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.name,
          content: JSON.stringify(result),
        });
      }

      if (context.state.shouldAbort) {
        await persistTurnAndIntelligence({
          phone,
          userText,
          botText: "Un momento, lo comunico con la Jauría.",
          profile,
          history,
          objecionPromise,
          redis,
          isAdmin,
          hasRealUserText,
        });
        return [
          {
            channel: message.channel,
            to: { id: phone },
            type: "text",
            text: "Un momento, lo comunico con la Jauría.",
          },
        ];
      }

      const round2 = await chat(apiMessages, { tools: BOT_TOOLS as any });
      finalTexto = round2.text;
    }

    // ── 7. Validador post-respuesta ──
    let validation = validateBotResponse(finalTexto);
    if (!validation.ok) {
      log.warn(
        { phone, prohibidas: validation.prohibidasMencionadas },
        "🚨 Hallucination detectada — forzando retry"
      );
      apiMessages.push({ role: "assistant", content: finalTexto });
      apiMessages.push({
        role: "user",
        content: buildCorrectiveMessage(validation),
      });
      const retry = await chat(apiMessages, { tools: BOT_TOOLS as any });
      finalTexto = retry.text;

      validation = validateBotResponse(finalTexto);
      if (!validation.ok) {
        log.error(
          { phone, prohibidas: validation.prohibidasMencionadas },
          "Hallucination persiste tras retry — usando fallback"
        );
        finalTexto =
          "Permítame verificar la disponibilidad exacta y le confirmo en breve.";
      }
    }

    // ── 8. Persistir turno + inteligencia ──
    await persistTurnAndIntelligence({
      phone,
      userText,
      botText: finalTexto,
      profile,
      history,
      objecionPromise,
      redis,
      isAdmin,
      hasRealUserText,
    });

    return [
      {
        channel: message.channel,
        to: { id: phone },
        type: "text",
        text: finalTexto,
      },
    ];
  } catch (error) {
    log.error({ err: error, phone }, "Error crítico en orchestrator");
    return [
      {
        channel: message.channel,
        to: { id: phone },
        type: "text",
        text: "🐺 Denos un momento y le daremos seguimiento.",
      },
    ];
  }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

interface PersistInput {
  phone: string;
  userText: string;
  botText: string;
  profile: any;
  history: any[];
  objecionPromise: Promise<ObjecionDetectada>;
  redis: ReturnType<typeof getRedis>;
  isAdmin: boolean;
  hasRealUserText: boolean;
}

async function persistTurnAndIntelligence(input: PersistInput): Promise<void> {
  const {
    phone,
    userText,
    botText,
    profile,
    history,
    objecionPromise,
    redis,
    isAdmin,
    hasRealUserText,
  } = input;

  await persistTurn(phone, userText, botText, redis);
  if (isAdmin) return;

  const tasks: Array<Promise<unknown>> = [];

  tasks.push(
    withTimeout(
      processObjecion(
        phone,
        hasRealUserText ? userText : "",
        profile,
        objecionPromise,
        redis
      ),
      INTELLIGENCE_TIMEOUT_MS,
      "objeciones"
    )
  );

  const newHistoryLength = history.length + 2;
  if (conversationRepo.debeRegenerarResumen(newHistoryLength)) {
    tasks.push(
      withTimeout(
        regenerateSummaryAndMemory(phone, history, userText, botText, redis),
        INTELLIGENCE_TIMEOUT_MS,
        "summary+memory"
      )
    );
  }

  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "rejected") {
      log.warn({ err: r.reason, phone }, "Tarea de inteligencia falló");
    }
  }
}

async function persistTurn(
  phone: string,
  userText: string,
  botText: string,
  redis: ReturnType<typeof getRedis>
): Promise<void> {
  await conversationRepo.appendMensaje(
    phone,
    { role: "user", content: userText } as any,
    redis
  );
  await conversationRepo.appendMensaje(
    phone,
    { role: "assistant", content: botText } as any,
    redis
  );
}

async function processObjecion(
  phone: string,
  userText: string,
  profile: any,
  objecionPromise: Promise<ObjecionDetectada>,
  redis: ReturnType<typeof getRedis>
): Promise<void> {
  const obj = await objecionPromise;

  if (obj.tipo !== "ninguna") {
    const updated = trackObjecion(profile, obj);
    await clientRepo.save(updated, redis);
    log.info(
      { phone, tipo: obj.tipo, severidad: obj.severidad },
      "Objeción registrada"
    );
    return;
  }

  if (userText && esTonoPositivo(userText)) {
    const decayed = decayObjeciones(profile);
    await clientRepo.save(decayed, redis);
    log.debug({ phone }, "Vector de objeciones aplicó decay");
  }
}

async function regenerateSummaryAndMemory(
  phone: string,
  history: any[],
  userText: string,
  botText: string,
  redis: ReturnType<typeof getRedis>
): Promise<void> {
  const fullHistory = [
    ...history,
    { role: "user", content: userText, timestamp: new Date().toISOString() },
    {
      role: "assistant",
      content: botText,
      timestamp: new Date().toISOString(),
    },
  ];

  const [resumenAnterior, memoriaActual] = await Promise.all([
    conversationRepo.getResumen(phone, redis).catch(() => null),
    getMemoria(phone, redis).catch(() => ({
      hechos: [] as HechoEpisodico[],
      ultimaActualizacion: new Date(0).toISOString(),
    })),
  ]);

  const mensajesUsuario = fullHistory
    .filter((m: any) => m.role === "user")
    .slice(-5)
    .map((m: any) => m.content);

  const [nuevoResumen, hechosNuevos] = await Promise.all([
    regenerateSummary({
      historial: fullHistory as any,
      resumenAnterior: resumenAnterior ?? undefined,
    }).catch((err) => {
      log.warn({ err, phone }, "Resumen falló");
      return "";
    }),
    extractHechosEpisodicos({
      mensajesRecientes: mensajesUsuario,
      hechosExistentes: memoriaActual.hechos.map((h) => h.hecho),
    }).catch((err) => {
      log.warn({ err, phone }, "Extractor de hechos falló");
      return [] as HechoEpisodico[];
    }),
  ]);

  if (nuevoResumen && nuevoResumen.length > 0) {
    await conversationRepo.setResumen(phone, nuevoResumen, redis);
    log.info({ phone, length: nuevoResumen.length }, "Resumen regenerado");
  }

  if (hechosNuevos.length > 0) {
    const merged = mergeHechos(memoriaActual.hechos, hechosNuevos);
    await saveMemoria(phone, merged, redis);
    log.info(
      { phone, nuevos: hechosNuevos.length, total: merged.length },
      "Memoria actualizada"
    );
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Task "${label}" timeout`)), ms)
    ),
  ]);
}
