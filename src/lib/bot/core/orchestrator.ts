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
// ── FASE 10: observabilidad ────────────────────────────────────────
import { recordEvent } from "../observability/events";
// ── FASE 11B: audio + consentimiento ───────────────────────────────
import {
  transcribeIncoming,
  buildTooLongMessage,
  buildTranscriptionFailedMessage,
} from "../intelligence/audio/transcriber";
import {
  detectarRespuestaConsentimiento,
  buildConsentAcceptedMessage,
  buildConsentRejectedMessage,
  buildConsentAmbiguousMessage,
} from "../intelligence/consent/detector";
import {
  getConsentInfo,
  marcarOtorgado,
  marcarRechazado,
  marcarPendiente,
} from "../repositories/consent-repo";
import { decidirPropuestaMembresia } from "../intelligence/membership/decider";
// ── FEATURE 3: control humano ──────────────────────────────────────
import { isBotPaused } from "../repositories/pause-repo";
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
  const startTime = Date.now();

  // ── FEATURE 3: si el bot está pausado (control humano activo), no responder ──
  const paused = await isBotPaused(phone, redis);
  if (paused) {
    log.info({ phone }, "Bot PAUSADO — control humano activo, no se responde");
    try {
      await conversationRepo.appendMensaje(
        phone,
        {
          role: "user",
          content: message.type === "text" ? (message as any).text || "" : `[${message.type}]`,
        } as any,
        redis
      );
    } catch (err) {
      log.warn({ err, phone }, "No se pudo registrar mensaje en historial durante pause");
    }
    return [];
  }

  try {
    let profile = await clientRepo.findOrCreate(phone, redis);

    // ── 1. FASE 11B: si es AUDIO, transcribir antes de seguir ──
    let userText = message.text || "";
    let visionUsed = false;
    let audioUsed = false;

    if (message.type === "audio" && message.media?.nativeId) {
      log.info({ phone }, "Mensaje tipo audio recibido, transcribiendo");
      const result = await transcribeIncoming(
        {
          nativeId: message.media.nativeId,
          mimeType: message.media.mimeType,
          sha256: message.media.sha256,
          sizeBytes: message.media.sizeBytes,
        },
        { redis }
      );

      // Observability
      await recordEvent({
        type: "vision", // reutilizo tipo (sería ideal nuevo "audio" en EventType)
        clientId: phone,
        channel: message.channel,
        data: {
          subtype: "audio_transcripcion",
          ok: result.ok,
          tooLong: !result.ok && (result as any).tooLong,
        },
      });

      if (!result.ok) {
        const respuestaTexto = (result as any).tooLong
          ? buildTooLongMessage()
          : buildTranscriptionFailedMessage();
        // Persistir el turno aunque no haya texto del cliente
        await conversationRepo.appendMensaje(
          phone,
          { role: "user", content: "[audio no procesado]" } as any,
          redis
        );
        await conversationRepo.appendMensaje(
          phone,
          { role: "assistant", content: respuestaTexto } as any,
          redis
        );
        return [
          {
            channel: message.channel,
            to: { id: phone },
            type: "text",
            text: respuestaTexto,
          },
        ];
      }

      userText = result.text;
      audioUsed = true;
      log.info(
        { phone, length: userText.length, fromCache: result.fromCache },
        "Audio transcrito"
      );
    }

    // ── 2. FASE 7: si es imagen, analizar y enriquecer userText ──
    if (message.type === "image" && message.media) {
      log.info({ phone }, "Mensaje tipo imagen recibido, analizando con vision");
      try {
        const visionResult = await analyzeIncomingImage(message, { redis });
        userText = visionResult.enrichedUserMessage;
        visionUsed = true;
        await recordEvent({
          type: "vision",
          clientId: phone,
          channel: message.channel,
          data: {
            esProducto: visionResult.analysis.esProducto,
            tipoTela: visionResult.analysis.tipoTela,
            confianza: visionResult.analysis.confianza,
            fromCache: visionResult.fromCache,
          },
        });
      } catch (err) {
        log.error({ err, phone }, "Vision pipeline falló, continuando con caption");
        userText = message.media.caption
          ? `[Cliente mandó imagen pero no pudimos analizarla] Texto que escribió: "${message.media.caption}"`
          : "[Cliente mandó imagen pero no pudimos analizarla. Pregunta amablemente qué necesita.]";
      }
    }

    // ── 3. FASE 11B: ¿el cliente está respondiendo a la pregunta de consentimiento? ──
    // Si su estado es "pendiente", interpretamos su mensaje como respuesta.
    const consentInfo = getConsentInfo(profile);
    if (consentInfo.estado === "pendiente" && userText) {
      const respuesta = detectarRespuestaConsentimiento(userText);
      log.info({ phone, respuesta }, "Procesando respuesta de consentimiento");

      if (respuesta === "acepta") {
        await marcarOtorgado(phone, redis);
        const txt = buildConsentAcceptedMessage();
        await persistTurnSimple(phone, userText, txt, redis);
        return [
          { channel: message.channel, to: { id: phone }, type: "text", text: txt },
        ];
      }
      if (respuesta === "rechaza") {
        await marcarRechazado(phone, redis);
        const txt = buildConsentRejectedMessage();
        await persistTurnSimple(phone, userText, txt, redis);
        return [
          { channel: message.channel, to: { id: phone }, type: "text", text: txt },
        ];
      }
      // Ambiguo: volvemos a preguntar SIN cambiar estado
      const txt = buildConsentAmbiguousMessage();
      await persistTurnSimple(phone, userText, txt, redis);
      return [
        { channel: message.channel, to: { id: phone }, type: "text", text: txt },
      ];
    }

    // ── 4. Auto-extraer CP si vino texto del cliente ──
    const cpDetectado = firstCp(userText);
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

    // ── 5. FASE 5: extractor de objeciones en paralelo ──
    const hasRealUserText = (message.text || "").trim().length > 0;
    const objecionPromise: Promise<ObjecionDetectada> =
      isAdmin || !hasRealUserText
        ? Promise.resolve<ObjecionDetectada>({
            tipo: "ninguna",
            severidad: 1,
            contexto: "",
          })
        : extractObjecion(userText).catch((err) => {
            log.warn({ err, phone }, "Extractor de objeciones falló");
            return {
              tipo: "ninguna" as const,
              severidad: 1 as const,
              contexto: "",
            };
          });

    // ── 6. Prompt + objeción en paralelo ──
    const [objecionActual, systemContent] = await Promise.all([
      objecionPromise,
      buildSystemPrompt(profile, isAdmin, {
        redis,
        userMessage: userText,
      }),
    ]);

    const necesitaReconstruir =
      !isAdmin &&
      (objecionActual.tipo !== "ninguna" || (profile.totalCompras ?? 0) >= 3);

    const finalSystemContent = necesitaReconstruir
      ? await buildSystemPrompt(profile, isAdmin, {
          redis,
          userMessage: userText,
          objecionActual,
        })
      : systemContent;

    const apiMessages: any[] = [
      { role: "system", content: finalSystemContent },
      ...history,
      { role: "user", content: userText },
    ];

    // ── 7. Round 1 ──
    let response = await chat(apiMessages, { tools: BOT_TOOLS as any });
    let finalTexto = response.text;
    let conversionGenerated = false;
    let membresiaPropuesta = false;

    // ── 8. Tool calling loop ──
    if (response.toolCalls && response.toolCalls.length > 0) {
      const cobroTools = ["generar_cobro_stripe", "generar_cobro_spei"];
      conversionGenerated = response.toolCalls.some((tc) =>
        cobroTools.includes(tc.name)
      );
      membresiaPropuesta = response.toolCalls.some(
        (tc) => tc.name === "proponer_membresia"
      );

      apiMessages.push({
        role: "assistant",
        content: response.text || "",
        tool_calls: response.toolCalls.map((tc) => ({
          id: tc.id,
          name: tc.name,
          arguments: tc.arguments,
        })),
      } as any);

      for (const call of response.toolCalls) {
        const result = await executeTool(
          {
            function: {
              name: call.name,
              arguments: JSON.stringify(call.arguments),
            },
          } as any,
          context
        );
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
          objecionPromise: Promise.resolve(objecionActual),
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

    // ── 9. Validador post-respuesta ──
    let validation = validateBotResponse(finalTexto);
    if (!validation.ok) {
      log.warn(
        { phone, prohibidas: validation.prohibidasMencionadas },
        "🚨 Hallucination detectada — forzando retry"
      );
      await recordEvent({
        type: "hallucination",
        clientId: phone,
        channel: message.channel,
        data: {
          prohibidas: validation.prohibidasMencionadas,
        },
      });

      apiMessages.push({ role: "assistant", content: finalTexto });
      apiMessages.push({
        role: "user",
        content: buildCorrectiveMessage(validation),
      });
      const retry = await chat(apiMessages, { tools: BOT_TOOLS as any });
      finalTexto = retry.text;

      validation = validateBotResponse(finalTexto);
      if (!validation.ok) {
        finalTexto =
          "Permítame verificar la disponibilidad exacta y le confirmo en breve.";
      }
    }

    // ── 10. Persistir turno + inteligencia ──
    await persistTurnAndIntelligence({
      phone,
      userText,
      botText: finalTexto,
      profile,
      history,
      objecionPromise: Promise.resolve(objecionActual),
      redis,
      isAdmin,
      hasRealUserText,
    });

    // ── 11. Observability ──
    if (!isAdmin) {
      await recordEvent({
        type: "message",
        clientId: phone,
        channel: message.channel,
        data: {
          inputType: message.type,
          visionUsed,
          audioUsed,
          membresiaPropuesta,
          latencyMs: Date.now() - startTime,
        },
      });

      if (conversionGenerated) {
        await recordEvent({
          type: "conversion",
          clientId: phone,
          channel: message.channel,
        });
      }
    }

    // ── 12. FASE 11B: si en este turno el bot pidió consentimiento, marcar pendiente ──
    // Heurística: si el cliente cumple triggers para membresía Y su estado de consentimiento
    // era "no_solicitado", el system prompt instruyó al bot a pedirlo.
    // Asumimos que el bot siguió la instrucción y marcamos pendiente.
    if (!isAdmin && consentInfo.estado === "no_solicitado") {
      const propuestaCheck = decidirPropuestaMembresia(
        {
          tierActual: (profile as any).membershipTracking?.tier ?? "NONE",
          totalCompras: profile.totalCompras ?? 0,
          vecesPropuesta:
            (profile as any).membershipTracking?.vecesPropuesta ?? 0,
          ultimaPropuesta: (profile as any).membershipTracking?.ultimaPropuesta,
          rechazoExplicito: (profile as any).membershipTracking
            ?.rechazoExplicito,
          vetoMarketing: (profile as any).vetoMarketing,
          consentEstado: "no_solicitado",
        },
        objecionActual
      );
      if (propuestaCheck.deberiaProponer && propuestaCheck.requierePedirConsentimiento) {
        try {
          await marcarPendiente(phone, redis);
        } catch (err) {
          log.warn({ err, phone }, "No se pudo marcar pendiente de consentimiento");
        }
      }
    }

    return [
      {
        channel: message.channel,
        to: { id: phone },
        type: "text",
        text: finalTexto,
      },
    ];
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error({ err: error, phone }, "Error crítico en orchestrator");

    await recordEvent({
      type: "error",
      clientId: phone,
      channel: message.channel,
      data: { source: "orchestrator", message: msg },
    });

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

  await persistTurnSimple(phone, userText, botText, redis);
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

async function persistTurnSimple(
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
    await recordEvent({
      type: "objection",
      clientId: phone,
      data: {
        tipo: obj.tipo,
        severidad: obj.severidad,
      },
    });
    return;
  }

  if (userText && esTonoPositivo(userText)) {
    const decayed = decayObjeciones(profile);
    await clientRepo.save(decayed, redis);
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
    }).catch(() => ""),
    extractHechosEpisodicos({
      mensajesRecientes: mensajesUsuario,
      hechosExistentes: memoriaActual.hechos.map((h) => h.hecho),
    }).catch(() => [] as HechoEpisodico[]),
  ]);

  if (nuevoResumen && nuevoResumen.length > 0) {
    await conversationRepo.setResumen(phone, nuevoResumen, redis);
  }

  if (hechosNuevos.length > 0) {
    const merged = mergeHechos(memoriaActual.hechos, hechosNuevos);
    await saveMemoria(phone, merged, redis);
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

