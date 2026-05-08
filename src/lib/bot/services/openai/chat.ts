/**
 * Wrapper tipado de OpenAI chat completions con function calling estricto.
 *
 * Reemplaza el approach del v1 de parsear comandos como `GENERAR_COBRO|...`
 * en texto. Aquí GPT invoca funciones con argumentos validados por JSON
 * Schema, y nosotros recibimos objetos JS limpios.
 *
 * Soporta:
 *  - Texto regular (no tool calls)
 *  - Tool calls múltiples en un solo turno
 *  - Timeout per-call con AbortController
 *  - Errores tipados (timeout vs API error)
 *  - Inyección de cliente para tests
 *
 * NO maneja el "tool calling loop" (turn 1: GPT pide tool → ejecutar →
 * turn 2: GPT con resultado). Eso es responsabilidad del orquestador en
 * Fase 3. Esta función es de un solo round-trip.
 */
import type OpenAI from "openai";
import { getOpenAIClient } from "./client";
import { getEnv } from "../../config/env";
import { getLogger } from "../../observability/logger";
import { RESILIENCE } from "../../config/constants";

const log = getLogger({ module: "openai/chat" });

// ── Tipos públicos ────────────────────────────────────────────────

export interface ChatTool {
  /** Nombre único. Debe matchear con el handler en tools/handlers/<name>.ts */
  name: string;
  /** Descripción humana. Se le da a GPT para que sepa cuándo usarla. */
  description: string;
  /** JSON Schema de los argumentos que GPT debe pasar. */
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  /** ID que asignó OpenAI a esta llamada. Se usa para responder con el resultado. */
  id: string;
  name: string;
  /** Args ya parseados de JSON. Si OpenAI manda JSON inválido, queda {}. */
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Solo para role === "tool": ID de la llamada a la que respondemos. */
  tool_call_id?: string;
  /** Solo para role === "tool": nombre de la tool ejecutada. */
  name?: string;
  /** Solo para role === "assistant" cuando previamente pidió tools. */
  tool_calls?: ToolCallRequest[];
}

export interface ChatResponse {
  /** Texto que GPT quiere devolver. Vacío si solo pidió tools. */
  text: string;
  /** Tools que GPT quiere ejecutar este turno. */
  toolCalls: ToolCallRequest[];
  /** stop | tool_calls | length | content_filter */
  finishReason: string;
  /** Tracking de tokens para costos. */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ChatOptions {
  /** Default: env.OPENAI_MODEL. */
  model?: string;
  /** Default: 0.1 (determinístico para venta). */
  temperature?: number;
  /** Default: 700 tokens. */
  maxTokens?: number;
  /** Tools disponibles este turno. Sin esto, GPT solo puede responder texto. */
  tools?: ChatTool[];
  /** "auto" deja a GPT decidir. "none" prohíbe tools. {name} fuerza una. */
  toolChoice?: "auto" | "none" | { name: string };
  /** Default: RESILIENCE.OPENAI_TIMEOUT_MS. */
  timeoutMs?: number;
}

// ── Errores ───────────────────────────────────────────────────────

export class ChatTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatTimeoutError";
  }
}

// ── Función principal ─────────────────────────────────────────────

export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {},
  client: OpenAI = getOpenAIClient()
): Promise<ChatResponse> {
  const env = getEnv();
  const model = options.model ?? env.OPENAI_MODEL;
  const temperature = options.temperature ?? 0.1;
  const maxTokens = options.maxTokens ?? 700;
  const timeoutMs = options.timeoutMs ?? RESILIENCE.OPENAI_TIMEOUT_MS;

  const apiMessages = messages.map(toOpenAIMessage);
  const apiTools = buildTools(options.tools);
  const apiToolChoice = buildToolChoice(options.toolChoice);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    log.debug(
      {
        model,
        msgCount: messages.length,
        toolCount: apiTools?.length ?? 0,
        temperature,
      },
      "OpenAI chat request"
    );

    const response = await client.chat.completions.create(
      {
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
        ...(apiTools ? { tools: apiTools } : {}),
        ...(apiToolChoice ? { tool_choice: apiToolChoice } : {}),
      },
      { signal: controller.signal }
    );

    const parsed = parseResponse(response);
    log.debug(
      {
        finishReason: parsed.finishReason,
        toolCalls: parsed.toolCalls.length,
        latencyMs: Date.now() - startedAt,
        usage: parsed.usage,
      },
      "OpenAI chat response"
    );
    return parsed;
  } catch (err: unknown) {
    if (controller.signal.aborted || isAbortError(err)) {
      log.error({ timeoutMs, model }, "OpenAI chat timeout");
      throw new ChatTimeoutError(
        `OpenAI chat request timed out after ${timeoutMs}ms`
      );
    }
    log.error({ err, model }, "OpenAI chat error");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ── Helpers internos ──────────────────────────────────────────────

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: string };
  return e.name === "AbortError" || e.code === "ABORT_ERR";
}

/** Convierte nuestro ChatMessage al formato que espera el SDK de OpenAI. */
function toOpenAIMessage(msg: ChatMessage): Record<string, unknown> {
  if (msg.role === "tool") {
    return {
      role: "tool",
      tool_call_id: msg.tool_call_id ?? "",
      content: msg.content,
    };
  }
  if (msg.role === "assistant" && msg.tool_calls && msg.tool_calls.length > 0) {
    return {
      role: "assistant",
      content: msg.content || null,
      tool_calls: msg.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function",
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      })),
    };
  }
  return { role: msg.role, content: msg.content };
}

function buildTools(tools: ChatTool[] | undefined) {
  if (!tools || tools.length === 0) return undefined;
  return tools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

function buildToolChoice(choice: ChatOptions["toolChoice"]) {
  if (!choice) return undefined;
  if (choice === "auto" || choice === "none") return choice;
  return { type: "function" as const, function: { name: choice.name } };
}

/** Convierte la respuesta cruda del SDK a nuestro tipo ChatResponse. */
function parseResponse(response: unknown): ChatResponse {
  // El SDK regresa una shape estable; defensivamente validamos.
  const r = response as {
    choices?: Array<{
      finish_reason?: string;
      message?: {
        content?: string | null;
        tool_calls?: Array<{
          id: string;
          type: string;
          function: { name: string; arguments: string };
        }>;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const choice = r.choices?.[0];
  if (!choice) {
    log.warn({ response }, "OpenAI response sin choices");
    return { text: "", toolCalls: [], finishReason: "stop" };
  }

  const message = choice.message ?? {};
  const text = message.content ?? "";
  const finishReason = choice.finish_reason ?? "stop";

  const toolCalls: ToolCallRequest[] = [];
  if (Array.isArray(message.tool_calls)) {
    for (const tc of message.tool_calls) {
      if (tc.type !== "function" || !tc.function) continue;
      let args: Record<string, unknown> = {};
      try {
        args = tc.function.arguments
          ? (JSON.parse(tc.function.arguments) as Record<string, unknown>)
          : {};
      } catch (err) {
        log.warn(
          { err, raw: tc.function.arguments, name: tc.function.name },
          "Tool arguments JSON inválidos — usando {} vacío"
        );
      }
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: args,
      });
    }
  }

  const usage = r.usage
    ? {
        promptTokens: r.usage.prompt_tokens ?? 0,
        completionTokens: r.usage.completion_tokens ?? 0,
        totalTokens: r.usage.total_tokens ?? 0,
      }
    : undefined;

  return { text, toolCalls, finishReason, usage };
}
