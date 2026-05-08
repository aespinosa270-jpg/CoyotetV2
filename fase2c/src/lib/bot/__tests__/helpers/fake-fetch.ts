/**
 * __tests__/helpers/fake-fetch.ts
 *
 * Helper para mockear fetch en tests de servicios Meta.
 * Evita llamadas reales a la Graph API de Meta durante la CI.
 */

import { vi } from "vitest";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

export interface FakeResponse {
  ok: boolean;
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

// ─── Builder ───────────────────────────────────────────────────────────────────

/**
 * Construye un objeto Response falso compatible con lo que espera fetch.
 */
function buildResponse(fake: FakeResponse): Response {
  const bodyStr = JSON.stringify(fake.body);
  const headers = new Headers({
    "content-type": "application/json",
    "content-length": String(Buffer.byteLength(bodyStr)),
    ...(fake.headers ?? {}),
  });

  return {
    ok: fake.ok,
    status: fake.status,
    headers,
    json: async () => fake.body,
    text: async () => bodyStr,
    arrayBuffer: async () => Buffer.from(bodyStr).buffer,
  } as unknown as Response;
}

// ─── API pública ───────────────────────────────────────────────────────────────

/**
 * Instala un mock de fetch que devuelve la respuesta indicada.
 * Llama a vi.restoreAllMocks() en el afterEach de tu test para limpiarlo.
 *
 * @example
 * mockFetch({ ok: true, status: 200, body: { messages: [{ id: 'wamid.abc' }] } });
 */
export function mockFetch(response: FakeResponse): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockResolvedValue(buildResponse(response));
  vi.stubGlobal("fetch", mock);
  return mock;
}

/**
 * Instala un mock de fetch que responde con una secuencia de respuestas.
 * La primera llamada devuelve responses[0], la segunda responses[1], etc.
 */
export function mockFetchSequence(
  responses: FakeResponse[]
): ReturnType<typeof vi.fn> {
  const mock = vi.fn();
  for (const r of responses) {
    mock.mockResolvedValueOnce(buildResponse(r));
  }
  vi.stubGlobal("fetch", mock);
  return mock;
}

/**
 * Instala un mock de fetch que lanza un error de red.
 */
export function mockFetchNetworkError(
  message = "Network error"
): ReturnType<typeof vi.fn> {
  const mock = vi.fn().mockRejectedValue(new Error(message));
  vi.stubGlobal("fetch", mock);
  return mock;
}

// ─── Respuestas predefinidas de Meta ───────────────────────────────────────────

/** Respuesta exitosa estándar de la WhatsApp Messages API */
export const META_SEND_SUCCESS: FakeResponse = {
  ok: true,
  status: 200,
  body: {
    messaging_product: "whatsapp",
    contacts: [{ input: "5215512345678", wa_id: "5215512345678" }],
    messages: [{ id: "wamid.abc123XYZ" }],
  },
};

/** Error 400 — parámetro inválido (no reintentable) */
export const META_SEND_400: FakeResponse = {
  ok: false,
  status: 400,
  body: {
    error: {
      message: "Invalid parameter",
      type: "OAuthException",
      code: 100,
      fbtrace_id: "test",
    },
  },
};

/** Error 500 — falla de servidor Meta (reintentable) */
export const META_SEND_500: FakeResponse = {
  ok: false,
  status: 500,
  body: {
    error: {
      message: "Internal server error",
      type: "InternalError",
      code: 1,
      fbtrace_id: "test",
    },
  },
};

/** Respuesta de media info (paso 1 de descarga) */
export const META_MEDIA_INFO: FakeResponse = {
  ok: true,
  status: 200,
  body: {
    id: "media_12345",
    url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=media_12345",
    mime_type: "image/jpeg",
    file_size: 1024,
    sha256: "abc123hash",
  },
};

/** Respuesta de descarga de media (paso 2) — bytes simulados como JSON */
export const META_MEDIA_BYTES: FakeResponse = {
  ok: true,
  status: 200,
  body: Buffer.from("fake-image-bytes").toString(),
  headers: { "content-type": "image/jpeg", "content-length": "16" },
};
