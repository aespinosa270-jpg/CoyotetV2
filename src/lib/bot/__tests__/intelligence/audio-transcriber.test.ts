import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  transcribeIncoming,
  MAX_AUDIO_SIZE_BYTES,
  buildTooLongMessage,
  buildTranscriptionFailedMessage,
} from "../../intelligence/audio/transcriber";
import { createFakeRedis } from "../helpers/fake-redis";

vi.mock("../../services/meta/media", () => ({
  downloadMedia: vi.fn(),
  getMediaInfo: vi.fn(),
}));
vi.mock("../../services/openai/whisper", () => ({
  transcribeAudio: vi.fn(),
}));

import * as metaMedia from "../../services/meta/media";
import * as whisper from "../../services/openai/whisper";

describe("intelligence/audio — transcribeIncoming", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
    vi.clearAllMocks();
  });

  it("rechaza pre-descarga si sizeBytes excede el límite", async () => {
    const result = await transcribeIncoming(
      {
        nativeId: "abc",
        sizeBytes: MAX_AUDIO_SIZE_BYTES + 100,
        sha256: "hash1",
      },
      { redis: env.redis }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.tooLong).toBe(true);
    }
    // No debió descargar ni transcribir
    expect(metaMedia.downloadMedia).not.toHaveBeenCalled();
    expect(whisper.transcribeAudio).not.toHaveBeenCalled();
  });

  it("transcribe audio dentro del límite", async () => {
    vi.mocked(metaMedia.downloadMedia).mockResolvedValueOnce({
      base64: "ZmFrZQ==",
      mimeType: "audio/ogg",
      sizeBytes: 50_000,
    });
    vi.mocked(whisper.transcribeAudio).mockResolvedValueOnce({
      text: "Hola, busco felpa polar",
      durationSec: 30,
    });

    const result = await transcribeIncoming(
      { nativeId: "abc", sizeBytes: 50_000, sha256: "hash1" },
      { redis: env.redis }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe("Hola, busco felpa polar");
      expect(result.fromCache).toBe(false);
    }
  });

  it("cachea transcripciones por sha256", async () => {
    vi.mocked(metaMedia.downloadMedia).mockResolvedValue({
      base64: "ZmFrZQ==",
      mimeType: "audio/ogg",
      sizeBytes: 50_000,
    });
    vi.mocked(whisper.transcribeAudio).mockResolvedValueOnce({
      text: "primera transcripción",
    });

    // Primera llamada — debe transcribir
    const r1 = await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "hash-cached" },
      { redis: env.redis }
    );
    expect(r1.ok).toBe(true);

    // Segunda llamada — debe venir del cache, NO transcribir de nuevo
    const r2 = await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "hash-cached" },
      { redis: env.redis }
    );

    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.text).toBe("primera transcripción");
      expect(r2.fromCache).toBe(true);
    }
    expect(whisper.transcribeAudio).toHaveBeenCalledTimes(1);
  });

  it("skipCache=true ignora el cache", async () => {
    vi.mocked(metaMedia.downloadMedia).mockResolvedValue({
      base64: "ZmFrZQ==",
      mimeType: "audio/ogg",
      sizeBytes: 50_000,
    });
    vi.mocked(whisper.transcribeAudio).mockResolvedValue({
      text: "fresca",
    });

    await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "h" },
      { redis: env.redis }
    );
    const r2 = await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "h" },
      { redis: env.redis, skipCache: true }
    );

    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.fromCache).toBe(false);
    expect(whisper.transcribeAudio).toHaveBeenCalledTimes(2);
  });

  it("si Whisper retorna vacío, retorna error", async () => {
    vi.mocked(metaMedia.downloadMedia).mockResolvedValueOnce({
      base64: "x",
      mimeType: "audio/ogg",
      sizeBytes: 50_000,
    });
    vi.mocked(whisper.transcribeAudio).mockResolvedValueOnce({ text: "" });

    const r = await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "h" },
      { redis: env.redis }
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.tooLong).toBe(false);
  });

  it("si downloadMedia tira, retorna error sin tirar", async () => {
    vi.mocked(metaMedia.downloadMedia).mockRejectedValueOnce(
      new Error("Meta caído")
    );

    const r = await transcribeIncoming(
      { nativeId: "x", sizeBytes: 50_000, sha256: "h" },
      { redis: env.redis }
    );

    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.tooLong).toBe(false);
      expect((r as any).error).toContain("Meta");
    }
  });

  it("si no se pasa sizeBytes, consulta getMediaInfo para validar tamaño", async () => {
    vi.mocked(metaMedia.getMediaInfo).mockResolvedValueOnce({
      url: "fake",
      mimeType: "audio/ogg",
      fileSize: MAX_AUDIO_SIZE_BYTES + 1000,
      expiresAt: new Date(),
    });

    const r = await transcribeIncoming(
      { nativeId: "x", sha256: "h" }, // sin sizeBytes
      { redis: env.redis }
    );

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.tooLong).toBe(true);
    // No bajó el audio porque getMediaInfo dijo que era muy grande
    expect(metaMedia.downloadMedia).not.toHaveBeenCalled();
  });
});

describe("intelligence/audio — mensajes", () => {
  it("buildTooLongMessage menciona límite", () => {
    const msg = buildTooLongMessage();
    expect(msg.toLowerCase()).toContain("largo");
    expect(msg).toContain("2 minutos");
  });

  it("buildTranscriptionFailedMessage es amable", () => {
    const msg = buildTranscriptionFailedMessage();
    expect(msg.toLowerCase()).toContain("problema");
  });
});
