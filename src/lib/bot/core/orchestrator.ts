import { getLogger } from "../observability/logger";
import { getRedis } from "../repositories/redis";
import * as clientRepo from "../repositories/client-repo";
import * as conversationRepo from "../repositories/conversation-repo";
import { buildSystemPrompt } from "../intelligence/prompts/builder";
import { chat } from "../services/openai/chat";
import { BOT_TOOLS } from "../tools/definitions";
import { executeTool } from "../tools/executor";
import { firstCp } from "../domain/extractors/postal-code";
import { detectTelaNoManejada } from "../domain/extractors/tela-no-manejada";
import { extractReferralCode } from "../services/referrals/service";
import {
  extractContactInfo,
  isValidEmail,
  isValidName,
} from "../domain/extractors/contact-info";
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
// ── FEATURE 4: escalaciones ────────────────────────────────────────
import {
  detectAllReasons,
  incrementHallucinationCount,
  resetHallucinationCount,
} from "../domain/escalation/detector";
import { triggerEscalation } from "../services/escalation-notifier";
// ── FASE B: lead scoring + enrichment ──────────────────────────────
import { scoreLead } from "../intelligence/scoring/lead-scorer";
import { enrichProfile } from "../intelligence/scoring/profile-enricher";
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
        type: "vision",
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

    // ── Flags base (movidas arriba para usarse en escalación) ──
    const isAdmin = userText.trim().toLowerCase() === "elcoyote56";
    const hasRealUserText = (message.text || "").trim().length > 0;

    // ── 3. FASE 11B: ¿el cliente está respondiendo a la pregunta de consentimiento? ──
    const consentInfo = getConsentInfo(profile);
    if (consentInfo.estado === "pendiente" && userText) {
      // ── G1+ ESCAPE HATCH AMPLIADO ──
      // Si el cliente habla de venta/producto/frustración → cancelar consent y atender venta.
      // Patrones AMPLIOS porque pedir consent en medio de una venta MATA conversión.
      const ventaPattern = /(precio|cu[aá]nto|cotiza|contenedor|tonelada|lote|kg|kilos?|rollos?|metros?|comprar|adquirir|pedido|quiero|necesito|me\s+interesa|me\s+gustar[ií]a|me\s+manda|puede|podr[ií]a|tiene|tienen|hay|urgente|env[ií]o|env[ií]a|pago|pagar|stock|disponib|mu[eé]strame|mu[eé]stre|catalog|prepar(a|e)\s+(el\s+|mi\s+)?pedido|color(es)?|blanco|negro|rojo|azul|verde|amarillo|gris|rosa|marino|rey|fiusha|vino|menta|caqui|cielo|petr[oó]leo|naranja|p[uú]rpura|morado|magenta|lila|aqua|botella|militar|oxford|perla|turquesa|navy|francia|bandera|chedron|fresa|mango|menta|mostaza|uva|canario|coral|caf[eé]|bronce|oro|plata|tubular|gramaje|calibre|ancho|rendimien|sublimaci|deportiv|invernal|escolar|playera|licra|panal|panaltrio|pique|piquet|sportok|micropique|felpa|polar|inter|madelino|diablo|liluna|spandex|polyester|poli[eé]ster|algod[oó]n|dry.?fit|tela|telas|prenda|costo|sale\s+en|le\s+queda|me\s+queda)/i;

      const frustracionPattern = /(p[eé]simo|pendejo|verga|chinga|fuera\s+de\s+contexto|no\s+entiend|mal\s+servicio|ctm|wtf|qu[eé]\s+pas|pinche|robo|estafa|mam[oó]n)/i;

      const cambioTema = ventaPattern.test(userText) || frustracionPattern.test(userText);

      // ── Contador de re-preguntas (máximo 1) ──
      const reaskCount = await getReaskCount(phone, redis);

      if (cambioTema) {
        log.info({ phone, userText, reaskCount }, "G1+: Cliente cambió tema — cancelando consent, atendiendo venta");
        try {
          await marcarRechazado(phone, redis);
          await resetReaskCount(phone, redis);
        } catch (err) {
          log.warn({ err, phone }, "No se pudo marcar consent rechazado");
        }
        // NO retornamos — caemos al flujo normal abajo
      } else {
        const respuesta = detectarRespuestaConsentimiento(userText);
        log.info({ phone, respuesta, reaskCount }, "Procesando respuesta de consentimiento");

        if (respuesta === "acepta") {
          await marcarOtorgado(phone, redis);
          await resetReaskCount(phone, redis);
          const txt = buildConsentAcceptedMessage();
          await persistTurnSimple(phone, userText, txt, redis);
          return [
            { channel: message.channel, to: { id: phone }, type: "text", text: txt },
          ];
        }
        if (respuesta === "rechaza") {
          await marcarRechazado(phone, redis);
          await resetReaskCount(phone, redis);
          const txt = buildConsentRejectedMessage();
          await persistTurnSimple(phone, userText, txt, redis);
          return [
            { channel: message.channel, to: { id: phone }, type: "text", text: txt },
          ];
        }

        // Ambiguo
        if (reaskCount >= 1) {
          // Ya re-preguntamos antes: cancelamos consent y atendemos venta
          log.info({ phone, userText, reaskCount }, "G1+: 2 ambiguos seguidos — abandonando consent, atendiendo conversación normal");
          try {
            await marcarRechazado(phone, redis);
            await resetReaskCount(phone, redis);
          } catch (err) {
            log.warn({ err, phone }, "No se pudo marcar consent rechazado tras 2 ambiguos");
          }
          // NO retornamos — caemos al flujo normal
        } else {
          // Primera vez ambiguo: re-preguntamos UNA sola vez
          await incrementReaskCount(phone, redis);
          const txt = buildConsentAmbiguousMessage();
          await persistTurnSimple(phone, userText, txt, redis);
          return [
            { channel: message.channel, to: { id: phone }, type: "text", text: txt },
          ];
        }
      }
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

    // ── 4.2. PRE-DETECTOR de telas FUERA del catálogo (anti-rate-limit) ──
    // Si el cliente pide "manta", "lino", "casimir", etc. detectamos AQUÍ
    // y registramos la oportunidad ANTES de mandar a GPT.
    // Así no perdemos el registro aunque OpenAI falle por 429/timeout.
    if (userText) {
      const telaDetection = detectTelaNoManejada(userText);

        // PRE-DETECTOR REFERIDOS (deterministico, NO depende de GPT)
        const codigoReferido = extractReferralCode(userText);
        if (codigoReferido) {
          try {
            await executeTool(
              {
                function: {
                  name: "aplicar_codigo_referido",
                  arguments: JSON.stringify({ codigo: codigoReferido }),
                },
              } as any,
              {
                message,
                redis,
                profile,
                history: [],
              } as any
            );
            log.info({ phone, codigo: codigoReferido }, "Pre-detector aplico codigo referido");
          } catch (err) {
            log.warn({ err, phone, codigo: codigoReferido }, "Pre-detector referido fallo");
          }
        }

      if (telaDetection.detected && telaDetection.telaIdentificada) {
        // Evitar duplicar si ya se registró la misma tela en esta sesión
        const yaRegistrada =
          (profile as any).telasNoManejadasRegistradas?.includes(telaDetection.telaIdentificada) ?? false;

        if (!yaRegistrada) {
          try {
            const result = await executeTool(
              {
                function: {
                  name: "registrar_tela_no_manejada",
                  arguments: JSON.stringify({
                    tela_identificada: telaDetection.telaIdentificada,
                    descripcion: `Detectado automáticamente del mensaje del cliente: "${userText.substring(0, 200)}"`,
                  }),
                },
              } as any,
              {
                message,
                redis,
                profile,
                history: [],
              } as any
            );

            log.info(
              { phone, tela: telaDetection.telaIdentificada, matched: telaDetection.matched, result },
              "🎯 PRE-DETECTOR: tela fuera de catálogo registrada determinísticamente"
            );

            await recordEvent({
              type: "objection",
              clientId: phone,
              channel: "whatsapp",
              data: {
                subtype: "tela_no_manejada_pre_detected",
                tela: telaDetection.telaIdentificada,
                mensaje: userText.substring(0, 200),
              },
            });

            // Marcar en perfil que ya se registró esta tela (evita duplicados)
            const yaRegistradas = (profile as any).telasNoManejadasRegistradas ?? [];
            profile = (await clientRepo.update(
              phone,
              {
                telasNoManejadasRegistradas: [...yaRegistradas, telaDetection.telaIdentificada],
              } as any,
              redis
            )) as any;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            log.warn({ phone, err: msg }, "Fallo pre-detector tela no manejada (continúa flujo normal)");
          }
        }
      }
    }

    // ── 4.5. FEATURE: auto-detectar nombre y email del mensaje ──
    if (userText) {
      const contactInfo = extractContactInfo(userText);
      const patch: any = {};

      if (
        contactInfo.nombre &&
        !profile.nombre &&
        isValidName(contactInfo.nombre)
      ) {
        patch.nombre = contactInfo.nombre;
      }
      if (
        contactInfo.email &&
        !(profile as any).correoElectronico &&
        isValidEmail(contactInfo.email)
      ) {
        patch.correoElectronico = contactInfo.email;
        patch.correoVerificado = false;
      }

      if (Object.keys(patch).length > 0) {
        profile = (await clientRepo.update(phone, patch, redis)) as any;
        log.info(
          { phone, captured: Object.keys(patch) },
          "Datos de contacto autodetectados del mensaje"
        );
        await recordEvent({
          type: "message",
          clientId: phone,
          channel: message.channel,
          data: { subtype: "contact_info_captured", fields: Object.keys(patch) },
        });
      }
    }

    // ── 4.55. FASE B: enriquecer perfil con datos extraídos del mensaje ──
    let leadScoreResult = null as any;
    if (!isAdmin && userText) {
      try {
        const enrichment = enrichProfile(profile, userText);
        if (Object.keys(enrichment.patches).length > 0) {
          profile = (await clientRepo.update(phone, enrichment.patches as any, redis)) as any;
          log.info(
            { phone, detected: enrichment.detected },
            "Perfil enriquecido automáticamente"
          );
        }

        // Calcular lead score (siempre, incluso sin patches)
        leadScoreResult = scoreLead(profile, userText);
        if ((profile as any).leadScore !== leadScoreResult.categoria) {
          await clientRepo.update(
            phone,
            { leadScore: leadScoreResult.categoria } as any,
            redis
          );
          (profile as any).leadScore = leadScoreResult.categoria;
          log.info(
            { phone, categoria: leadScoreResult.categoria, razones: leadScoreResult.razones },
            "Lead score actualizado"
          );
        }
      } catch (err) {
        log.warn({ err, phone }, "Error en enrichment/scoring (no bloqueante)");
      }
    }

    // ── 4.6. FEATURE 4: detectar escalación automática ──
    if (!isAdmin && userText && hasRealUserText) {
      const detection = await detectAllReasons(userText, phone, redis);
      if (detection.detected && detection.razon) {
        log.info(
          { phone, razon: detection.razon, contexto: detection.contexto },
          "🚨 Escalación automática detectada"
        );
        const result = await triggerEscalation({
          phone,
          nombre: profile.nombre || undefined,
          razon: detection.razon,
          contexto: detection.contexto ?? "",
          ultimoMsg: userText,
        });
        if (result.ok && !result.alreadyEscalated) {
          // Persistir el turno del usuario y retornar SIN llamar al LLM
          // (el mensaje del bot ya se persiste dentro de triggerEscalation)
          try {
            await conversationRepo.appendMensaje(
              phone,
              { role: "user", content: userText } as any,
              redis
            );
          } catch (err) {
            log.warn({ err, phone }, "No se pudo registrar mensaje del cliente en escalación");
          }
          await recordEvent({
            type: "error",
            clientId: phone,
            channel: message.channel,
            data: {
              subtype: "escalation",
              razon: detection.razon,
              contexto: detection.contexto,
            },
          });
          return [];
        }
      }
    }

    const history = await conversationRepo.getHistorial(phone, redis);

    const context: BotContext = {
      message,
      redis,
      profile,
      history,
      isAdmin,
      state: { shouldAbort: false },
    };

    // ── 5. FASE 5: extractor de objeciones en paralelo ──
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
      buildSystemPrompt(profile, isAdmin),
    ]);

    const necesitaReconstruir =
      !isAdmin &&
      (objecionActual.tipo !== "ninguna" || (profile.totalCompras ?? 0) >= 3);

    const finalSystemContent = necesitaReconstruir
      ? await buildSystemPrompt(profile, isAdmin)
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
    // Whitelist: extraer telas registradas en este turno via registrar_tela_no_manejada
    const telasRegistradasEnTurno: string[] = [];
    for (const m of apiMessages) {
      if ((m as any).role === "assistant" && (m as any).tool_calls) {
        for (const tc of (m as any).tool_calls as any[]) {
          if (tc.function?.name === "registrar_tela_no_manejada") {
            try {
              const args = JSON.parse(tc.function.arguments || "{}");
              const tela = (args.tela_identificada || "").toLowerCase().trim();
              if (tela) telasRegistradasEnTurno.push(tela);
            } catch {}
          }
        }
      }
    }

    let validation = validateBotResponse(finalTexto, telasRegistradasEnTurno);

    // FIX: si bot llamó registrar_tela_no_manejada exitosamente, reset hallucinations
    // (la mención de la tela no-catálogo es LEGÍTIMA, no es invención)
    if (telasRegistradasEnTurno.length > 0 && validation.ok) {
      try {
        await resetHallucinationCount(phone, redis);
        log.info(
          { phone, telas: telasRegistradasEnTurno },
          "🔄 Counter hallucinations reseteado tras registro legítimo de tela"
        );
      } catch (err) {
        log.warn({ err }, "No se pudo resetear counter hallucinations");
      }
    }
    if (!validation.ok) {
      log.warn(
        { phone, prohibidas: validation.prohibidasMencionadas },
        "🚨 Hallucination detectada — forzando retry"
      );
      // FEATURE 4: contador de hallucinations (escalación si pasa umbral)
      try {
        await incrementHallucinationCount(phone, redis);
      } catch (err) {
        log.warn({ err }, "No se pudo incrementar counter de hallucinations");
      }
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

      validation = validateBotResponse(finalTexto, telasRegistradasEnTurno);
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
        text: "Disculpe, tuve un problema procesando su mensaje. ¿Puede repetirme su última solicitud? Estoy aquí para ayudarle 🐺",
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


// ─────────────────────────────────────────────────────────
// G1+ Reask Count helpers (consent: máximo 1 re-pregunta)
// ─────────────────────────────────────────────────────────

const REASK_KEY = (phone: string) => `v2:consent_reask:${phone}`;
const REASK_TTL = 60 * 60; // 1 hora

async function getReaskCount(phone: string, redis: ReturnType<typeof getRedis>): Promise<number> {
  try {
    const val = await redis.get<number>(REASK_KEY(phone));
    return typeof val === "number" ? val : 0;
  } catch {
    return 0;
  }
}

async function incrementReaskCount(phone: string, redis: ReturnType<typeof getRedis>): Promise<void> {
  try {
    const key = REASK_KEY(phone);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, REASK_TTL);
    }
  } catch {
    // silently ignore
  }
}

async function resetReaskCount(phone: string, redis: ReturnType<typeof getRedis>): Promise<void> {
  try {
    await redis.del(REASK_KEY(phone));
  } catch {
    // silently ignore
  }
}