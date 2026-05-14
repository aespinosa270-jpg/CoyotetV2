import { describe, it, expect, vi } from "vitest";
import {
  buildIncomingFromTelegram,
  type TelegramUpdate,
} from "../../transports/telegram/inbound";
import { sendToTelegram } from "../../transports/telegram/outbound";
import type { OutgoingMessage } from "../../types/messages";

// ── Helpers ──────────────────────────────────────────────────────

function makeTextUpdate(text: string, overrides: any = {}): TelegramUpdate {
  return {
    update_id: 12345,
    message: {
      message_id: 1,
      date: 1715520000,
      from: {
        id: 987654321,
        first_name: "Juan",
        last_name: "Pérez",
        username: "juanp",
      },
      chat: { id: 987654321, type: "private" },
      text,
      ...overrides,
    },
  };
}

function makePhotoUpdate(caption = ""): TelegramUpdate {
  return {
    update_id: 12346,
    message: {
      message_id: 2,
      date: 1715520000,
      from: { id: 987, first_name: "Juan" },
      chat: { id: 987, type: "private" },
      caption,
      photo: [
        { file_id: "small", file_unique_id: "s", width: 90, height: 90, file_size: 1000 },
        {
          file_id: "medium",
          file_unique_id: "m",
          width: 320,
          height: 320,
          file_size: 5000,
        },
        {
          file_id: "large",
          file_unique_id: "l",
          width: 1280,
          height: 1280,
          file_size: 50000,
        },
      ],
    },
  };
}

// ── Tests inbound ────────────────────────────────────────────────

describe("transports/telegram — buildIncomingFromTelegram", () => {
  it("convierte mensaje de texto en privado", () => {
    const result = buildIncomingFromTelegram(makeTextUpdate("hola"));
    expect(result).not.toBeNull();
    expect(result!.channel).toBe("telegram");
    expect(result!.type).toBe("text");
    expect(result!.text).toBe("hola");
    expect(result!.from.id).toBe("tg:987654321");
    expect(result!.from.displayName).toBe("Juan Pérez");
  });

  it("usa username si no hay first_name", () => {
    const update = makeTextUpdate("x", {
      from: { id: 123, username: "anonimo" },
    });
    const result = buildIncomingFromTelegram(update);
    expect(result!.from.displayName).toBe("anonimo");
  });

  it("IGNORA mensajes de grupos", () => {
    const update = makeTextUpdate("hola");
    update.message!.chat.type = "group";
    expect(buildIncomingFromTelegram(update)).toBeNull();
  });

  it("IGNORA mensajes de supergroups y channels", () => {
    const u1 = makeTextUpdate("x");
    u1.message!.chat.type = "supergroup";
    expect(buildIncomingFromTelegram(u1)).toBeNull();

    const u2 = makeTextUpdate("x");
    u2.message!.chat.type = "channel";
    expect(buildIncomingFromTelegram(u2)).toBeNull();
  });

  it("IGNORA edited_message", () => {
    const update: TelegramUpdate = {
      update_id: 999,
      edited_message: makeTextUpdate("editado").message,
    };
    expect(buildIncomingFromTelegram(update)).toBeNull();
  });

  it("IGNORA callback_query (TODO en futuro)", () => {
    const update: TelegramUpdate = {
      update_id: 999,
      callback_query: {
        id: "cb1",
        from: { id: 123, first_name: "X" },
        data: "buy_alaska",
      },
    };
    expect(buildIncomingFromTelegram(update)).toBeNull();
  });

  it("foto: toma la versión MÁS GRANDE del array photo", () => {
    const result = buildIncomingFromTelegram(makePhotoUpdate("¿cuánto?"));
    expect(result).not.toBeNull();
    expect(result!.type).toBe("image");
    expect(result!.media!.nativeId).toBe("large"); // el de 1280x1280
    expect(result!.media!.caption).toBe("¿cuánto?");
    expect(result!.media!.sizeBytes).toBe(50000);
  });

  it("foto sin caption: caption queda como string vacío", () => {
    const result = buildIncomingFromTelegram(makePhotoUpdate());
    expect(result!.media!.caption).toBe("");
  });

  it("convierte date (unix segundos) a Date en ms", () => {
    const result = buildIncomingFromTelegram(makeTextUpdate("x"));
    expect(result!.receivedAt).toBeInstanceOf(Date);
    expect(result!.receivedAt.getTime()).toBe(1715520000 * 1000);
  });

  it("usa update_id como id interno (dedupe)", () => {
    const result = buildIncomingFromTelegram(makeTextUpdate("x"));
    expect(result!.id).toBe("tg_12345");
  });

  it("preserva el update completo en raw para debug", () => {
    const update = makeTextUpdate("x");
    const result = buildIncomingFromTelegram(update);
    expect(result!.raw).toBe(update);
  });

  it("update sin message ni callback ni edited → null", () => {
    expect(buildIncomingFromTelegram({ update_id: 1 })).toBeNull();
  });

  it("voice/audio/video/document/sticker/location → null (no soportados aún)", () => {
    const types = [
      { voice: { file_id: "v" } },
      { audio: { file_id: "a" } },
      { video: { file_id: "v" } },
      { document: { file_id: "d" } },
      { sticker: { file_id: "s" } },
      { location: { latitude: 1, longitude: 2 } },
    ];
    for (const t of types) {
      const update = makeTextUpdate("");
      update.message = { ...update.message!, ...t, text: undefined };
      expect(buildIncomingFromTelegram(update)).toBeNull();
    }
  });
});

// ── Tests outbound ───────────────────────────────────────────────

function fakeTelegramResponse(messageId = 100, ok = true): Response {
  return new Response(
    JSON.stringify({
      ok,
      result: ok ? { message_id: messageId } : undefined,
    }),
    { status: ok ? 200 : 400, headers: { "content-type": "application/json" } }
  );
}

describe("transports/telegram — sendToTelegram", () => {
  it("envía texto exitosamente", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeTelegramResponse(100));

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987654321" },
      type: "text",
      text: "Buenas tardes",
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("sent");
    expect(result.channelMessageId).toBe("100");

    // Verificar que llamó al endpoint correcto
    const call = fakeFetch.mock.calls[0];
    expect(call[0]).toContain("/sendMessage");
    const body = JSON.parse(call[1].body);
    expect(body.chat_id).toBe("987654321"); // sin el prefix "tg:"
    expect(body.text).toBe("Buenas tardes");
  });

  it("acepta to.id sin prefix 'tg:' (asume chat_id directo)", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeTelegramResponse(101));

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "987654321" },
      type: "text",
      text: "x",
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("sent");
    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.chat_id).toBe("987654321");
  });

  it("envía foto via sendPhoto", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeTelegramResponse(200));

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987" },
      type: "image",
      media: {
        url: "https://example.com/tela.jpg",
        caption: "Ejemplo de tela",
      },
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("sent");
    expect(fakeFetch.mock.calls[0][0]).toContain("/sendPhoto");
    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.photo).toBe("https://example.com/tela.jpg");
    expect(body.caption).toBe("Ejemplo de tela");
  });

  it("interactive: cae a texto plano con opciones numeradas", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeTelegramResponse(300));

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987" },
      type: "interactive",
      interactive: {
        body: "¿Cómo desea pagar?",
        buttons: [
          { payload: "card", label: "Tarjeta" },
          { payload: "oxxo", label: "OXXO" },
        ],
      },
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("sent");
    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.text).toContain("¿Cómo desea pagar?");
    expect(body.text).toContain("1. Tarjeta");
    expect(body.text).toContain("2. OXXO");
  });

  it("error HTTP 400 de Telegram → status failed", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"ok":false,"description":"bad request"}', { status: 400 })
      );

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987" },
      type: "text",
      text: "x",
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("400");
  });

  it("fetch tira excepción → status failed", async () => {
    const fakeFetch = vi.fn().mockRejectedValueOnce(new Error("network down"));

    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987" },
      type: "text",
      text: "x",
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("network");
  });

  it("foto sin URL → error", async () => {
    const fakeFetch = vi.fn();
    const outgoing: OutgoingMessage = {
      channel: "telegram",
      to: { id: "tg:987" },
      type: "image",
      media: { caption: "x" },
    };

    const result = await sendToTelegram(outgoing, fakeFetch as any);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("URL");
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});
