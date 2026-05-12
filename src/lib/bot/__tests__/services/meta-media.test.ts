import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  downloadMedia,
  getMediaInfo,
  MediaError,
} from "../../services/meta/media";

function makeFakeFetch(responses: Array<Response | Error>) {
  const fn = vi.fn();
  for (const r of responses) {
    if (r instanceof Error) fn.mockRejectedValueOnce(r);
    else fn.mockResolvedValueOnce(r);
  }
  return fn as unknown as typeof fetch;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function binaryResponse(bytes: Uint8Array, status = 200): Response {
  return new Response(bytes, { status });
}

describe("meta/media — getMediaInfo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resuelve un nativeId a su URL y metadata", async () => {
    const fakeFetch = makeFakeFetch([
      jsonResponse({
        url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=ABC",
        mime_type: "image/jpeg",
        sha256: "deadbeef",
        file_size: 12345,
      }),
    ]);

    const info = await getMediaInfo("media_xyz", fakeFetch);

    expect(info.url).toContain("lookaside");
    expect(info.mimeType).toBe("image/jpeg");
    expect(info.sha256).toBe("deadbeef");
    expect(info.fileSize).toBe(12345);
    expect(info.expiresAt).toBeInstanceOf(Date);
  });

  it("pasa el bearer token en el header", async () => {
    const fakeFetch = makeFakeFetch([
      jsonResponse({ url: "https://x", mime_type: "image/png" }),
    ]);

    await getMediaInfo("media_1", fakeFetch);

    const call = (fakeFetch as any).mock.calls[0];
    const opts = call[1];
    expect(opts.headers.Authorization).toMatch(/^Bearer /);
  });

  it("tira MediaError con stage='resolve' si Meta devuelve 4xx", async () => {
    const fakeFetch = makeFakeFetch([
      jsonResponse({ error: "not found" }, 404),
    ]);

    await expect(getMediaInfo("media_x", fakeFetch)).rejects.toThrow(
      MediaError
    );
  });

  it("tira si la respuesta no trae url o mime_type", async () => {
    const fakeFetch = makeFakeFetch([jsonResponse({})]);

    await expect(getMediaInfo("media_x", fakeFetch)).rejects.toThrow(
      "sin url/mime_type"
    );
  });
});

describe("meta/media — downloadMedia", () => {
  beforeEach(() => vi.clearAllMocks());

  it("descarga el binario y devuelve base64", async () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
    const fakeFetch = makeFakeFetch([
      // primera llamada: getMediaInfo
      jsonResponse({
        url: "https://lookaside.fbsbx.com/x",
        mime_type: "image/png",
        file_size: 4,
      }),
      // segunda llamada: descarga binario
      binaryResponse(bytes),
    ]);

    const r = await downloadMedia("media_xyz", fakeFetch);

    expect(r.mimeType).toBe("image/png");
    expect(r.sizeBytes).toBe(4);
    expect(r.base64).toBe(Buffer.from(bytes).toString("base64"));
  });

  it("usa bearer también en la descarga del binario", async () => {
    const fakeFetch = makeFakeFetch([
      jsonResponse({
        url: "https://lookaside.fbsbx.com/x",
        mime_type: "image/jpeg",
      }),
      binaryResponse(new Uint8Array([1, 2, 3])),
    ]);

    await downloadMedia("media_1", fakeFetch);

    const downloadCall = (fakeFetch as any).mock.calls[1];
    const opts = downloadCall[1];
    expect(opts.headers.Authorization).toMatch(/^Bearer /);
  });

  it("tira MediaError con stage='download' si la descarga falla", async () => {
    const fakeFetch = makeFakeFetch([
      jsonResponse({
        url: "https://lookaside.fbsbx.com/x",
        mime_type: "image/jpeg",
      }),
      new Response("forbidden", { status: 403 }),
    ]);

    await expect(downloadMedia("media_x", fakeFetch)).rejects.toThrow(
      MediaError
    );
  });
});
