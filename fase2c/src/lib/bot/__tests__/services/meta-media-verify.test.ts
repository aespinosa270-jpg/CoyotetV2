/**
 * __tests__/services/meta-media-verify.test.ts
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  mockFetch,
  mockFetchSequence,
  mockFetchNetworkError,
  META_MEDIA_INFO,
  META_MEDIA_BYTES,
  META_SEND_400,
} from "../helpers/fake-fetch";
import {
  getMediaInfo,
  downloadMedia,
  downloadMediaFromUrl,
  getMediaCategory,
} from "../../services/meta/media";
import { verifyWebhook, extractVerifyParams } from "../../services/meta/verify";

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── getMediaInfo ─────────────────────────────────────────────────────────────

describe("getMediaInfo", () => {
  it("obtiene metadata de un media exitosamente", async () => {
    mockFetch(META_MEDIA_INFO);

    const info = await getMediaInfo("media_12345");

    expect(info).not.toBeNull();
    expect(info!.id).toBe("media_12345");
    expect(info!.mimeType).toBe("image/jpeg");
    expect(info!.fileSize).toBe(1024);
    expect(info!.url).toContain("fbsbx.com");
  });

  it("devuelve null si Meta responde con error", async () => {
    mockFetch(META_SEND_400);

    const info = await getMediaInfo("media_invalid");
    expect(info).toBeNull();
  });

  it("devuelve null si hay error de red", async () => {
    mockFetchNetworkError();

    const info = await getMediaInfo("media_12345");
    expect(info).toBeNull();
  });
});

// ─── downloadMedia ────────────────────────────────────────────────────────────

describe("downloadMedia", () => {
  it("descarga media en dos pasos exitosamente", async () => {
    // Primer fetch: media info. Segundo fetch: bytes.
    mockFetchSequence([META_MEDIA_INFO, META_MEDIA_BYTES]);

    const result = await downloadMedia("media_12345");

    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.buffer).toBeDefined();
    expect(result.buffer!.length).toBeGreaterThan(0);
  });

  it("falla si no puede obtener la media info", async () => {
    mockFetch(META_SEND_400); // media info falla

    const result = await downloadMedia("media_bad");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("media_bad");
  });

  it("rechaza archivos que superan el límite de tamaño", async () => {
    const bigFileInfo = {
      ...META_MEDIA_INFO,
      body: {
        ...(META_MEDIA_INFO.body as object),
        file_size: 11 * 1024 * 1024, // 11 MB > límite de 10 MB
      },
    };
    mockFetch(bigFileInfo);

    const result = await downloadMedia("media_big");

    expect(result.ok).toBe(false);
    expect(result.error).toContain("grande");
  });

  it("maneja error de red en el segundo paso (descarga bytes)", async () => {
    mockFetchSequence([
      META_MEDIA_INFO,
      { ok: false, status: 403, body: { error: "Expired URL" } },
    ]);

    const result = await downloadMedia("media_12345");

    expect(result.ok).toBe(false);
  });
});

// ─── downloadMediaFromUrl ─────────────────────────────────────────────────────

describe("downloadMediaFromUrl", () => {
  it("descarga bytes desde una URL directamente", async () => {
    mockFetch(META_MEDIA_BYTES);

    const result = await downloadMediaFromUrl(
      "https://lookaside.fbsbx.com/test",
      "image/jpeg"
    );

    expect(result.ok).toBe(true);
    expect(result.buffer).toBeDefined();
  });
});

// ─── getMediaCategory ─────────────────────────────────────────────────────────

describe("getMediaCategory", () => {
  it("clasifica image/jpeg como image", () => {
    expect(getMediaCategory("image/jpeg")).toBe("image");
  });

  it("clasifica image/png como image", () => {
    expect(getMediaCategory("image/png")).toBe("image");
  });

  it("clasifica application/pdf como document", () => {
    expect(getMediaCategory("application/pdf")).toBe("document");
  });

  it("clasifica audio/ogg como audio", () => {
    expect(getMediaCategory("audio/ogg")).toBe("audio");
  });

  it("devuelve unknown para tipos no soportados", () => {
    expect(getMediaCategory("application/x-unknown")).toBe("unknown");
  });
});

// ─── verifyWebhook ────────────────────────────────────────────────────────────

describe("verifyWebhook", () => {
  it("verifica correctamente con token y challenge válidos", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      token: "test-verify-token", // coincide con env de vitest
      challenge: "abc123challenge",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.challenge).toBe("abc123challenge");
    }
  });

  it("falla si hub.mode no es subscribe", () => {
    const result = verifyWebhook({
      mode: "unsubscribe",
      token: "test-verify-token",
      challenge: "abc123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("hub.mode");
    }
  });

  it("falla si el token es incorrecto", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      token: "wrong-token",
      challenge: "abc123",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Token");
    }
  });

  it("falla si falta el challenge", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      token: "test-verify-token",
      challenge: null,
    });

    expect(result.ok).toBe(false);
  });

  it("falla si el token es null", () => {
    const result = verifyWebhook({
      mode: "subscribe",
      token: null,
      challenge: "abc123",
    });

    expect(result.ok).toBe(false);
  });
});

// ─── extractVerifyParams ──────────────────────────────────────────────────────

describe("extractVerifyParams", () => {
  it("extrae los tres parámetros correctamente de URLSearchParams", () => {
    const params = new URLSearchParams(
      "hub.mode=subscribe&hub.verify_token=mytoken&hub.challenge=xyz789"
    );

    const result = extractVerifyParams(params);

    expect(result.mode).toBe("subscribe");
    expect(result.token).toBe("mytoken");
    expect(result.challenge).toBe("xyz789");
  });

  it("devuelve null para parámetros ausentes", () => {
    const params = new URLSearchParams("hub.mode=subscribe");

    const result = extractVerifyParams(params);

    expect(result.token).toBeNull();
    expect(result.challenge).toBeNull();
  });
});
