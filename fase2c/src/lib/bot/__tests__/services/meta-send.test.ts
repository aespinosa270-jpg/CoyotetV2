/**
 * __tests__/services/meta-send.test.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockFetch,
  mockFetchSequence,
  mockFetchNetworkError,
  META_SEND_SUCCESS,
  META_SEND_400,
  META_SEND_500,
} from "../helpers/fake-fetch";
import { sendText, sendImage, sendDocument, markAsRead } from "../../services/meta/send";
import { normalizeMxPhone } from "../../services/meta/client";

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── normalizeMxPhone ──────────────────────────────────────────────────────────

describe("normalizeMxPhone", () => {
  it("convierte 521XXXXXXXXX (13 dígitos) a 52XXXXXXXXX", () => {
    expect(normalizeMxPhone("5215512345678")).toBe("525512345678");
  });

  it("no modifica números de 12 dígitos (ya normalizados)", () => {
    expect(normalizeMxPhone("525512345678")).toBe("525512345678");
  });

  it("no modifica números de otros países", () => {
    expect(normalizeMxPhone("15551234567")).toBe("15551234567");
  });

  it("elimina caracteres no numéricos", () => {
    expect(normalizeMxPhone("+52 55 1234 5678")).toBe("525512345678");
  });

  it("maneja el caso edge: 521 con exactamente 13 dígitos", () => {
    expect(normalizeMxPhone("5211234567890")).toBe("521234567890");
  });
});

// ─── sendText ─────────────────────────────────────────────────────────────────

describe("sendText", () => {
  it("envía mensaje de texto exitosamente", async () => {
    const fetchMock = mockFetch(META_SEND_SUCCESS);

    const result = await sendText("525512345678", "Hola, soy El Coyote 🐺");

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe("wamid.abc123XYZ");
    expect(result.attempts).toBe(1);

    // Verifica que el payload sea correcto
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messaging_product).toBe("whatsapp");
    expect(callBody.type).toBe("text");
    expect(callBody.text.body).toBe("Hola, soy El Coyote 🐺");
    expect(callBody.to).toBe("525512345678");
  });

  it("normaliza número mexicano 521→52 antes de enviar", async () => {
    const fetchMock = mockFetch(META_SEND_SUCCESS);

    await sendText("5215512345678", "Test");

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.to).toBe("525512345678");
  });

  it("NO reintenta en error 400 (error del caller)", async () => {
    const fetchMock = mockFetch(META_SEND_400);

    const result = await sendText("525512345678", "Test", { maxRetries: 2 });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1); // Solo 1 intento, sin reintentos
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reintenta en error 500 hasta maxRetries", async () => {
    // 2 fallos 500, luego éxito
    const fetchMock = mockFetchSequence([
      META_SEND_500,
      META_SEND_500,
      META_SEND_SUCCESS,
    ]);

    const result = await sendText("525512345678", "Test", {
      maxRetries: 2,
      baseDelayMs: 0, // Sin espera en tests
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("falla definitivamente después de agotar reintentos", async () => {
    mockFetchSequence([META_SEND_500, META_SEND_500, META_SEND_500]);

    const result = await sendText("525512345678", "Test", {
      maxRetries: 2,
      baseDelayMs: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
  });

  it("maneja error de red (excepción en fetch)", async () => {
    mockFetchNetworkError("ECONNREFUSED");

    const result = await sendText("525512345678", "Test", {
      maxRetries: 1,
      baseDelayMs: 0,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("ECONNREFUSED");
  });
});

// ─── sendImage ────────────────────────────────────────────────────────────────

describe("sendImage", () => {
  it("envía imagen con URL y caption", async () => {
    const fetchMock = mockFetch(META_SEND_SUCCESS);

    const result = await sendImage(
      "525512345678",
      "https://example.com/tela.jpg",
      "Micropique 145g"
    );

    expect(result.ok).toBe(true);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.type).toBe("image");
    expect(callBody.image.link).toBe("https://example.com/tela.jpg");
    expect(callBody.image.caption).toBe("Micropique 145g");
  });

  it("envía imagen sin caption", async () => {
    const fetchMock = mockFetch(META_SEND_SUCCESS);

    await sendImage("525512345678", "https://example.com/tela.jpg");

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.image.caption).toBeUndefined();
  });
});

// ─── sendDocument ─────────────────────────────────────────────────────────────

describe("sendDocument", () => {
  it("envía documento con filename y caption", async () => {
    const fetchMock = mockFetch(META_SEND_SUCCESS);

    const result = await sendDocument(
      "525512345678",
      "https://example.com/cotizacion.pdf",
      "cotizacion-coyote.pdf",
      "Su cotización adjunta"
    );

    expect(result.ok).toBe(true);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.type).toBe("document");
    expect(callBody.document.filename).toBe("cotizacion-coyote.pdf");
    expect(callBody.document.caption).toBe("Su cotización adjunta");
  });
});

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marca mensaje como leído", async () => {
    const fetchMock = mockFetch({ ok: true, status: 200, body: { success: true } });

    const result = await markAsRead("wamid.abc123");

    expect(result.ok).toBe(true);
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.status).toBe("read");
    expect(callBody.message_id).toBe("wamid.abc123");
  });

  it("devuelve ok:false si Meta falla, sin lanzar", async () => {
    mockFetchNetworkError();

    const result = await markAsRead("wamid.abc123");
    expect(result.ok).toBe(false);
  });
});
