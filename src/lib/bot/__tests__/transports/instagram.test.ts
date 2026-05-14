import { describe, it, expect, vi } from "vitest";
import {
  buildIncomingFromInstagram,
  type InstagramWebhookPayload,
} from "../../transports/instagram/inbound";
import { sendToInstagram } from "../../transports/instagram/outbound";
import {
  verifyInstagramSignature,
  handleVerifyChallenge,
} from "../../transports/instagram/verify";
import type { OutgoingMessage } from "../../types/messages";
import crypto from "crypto";

// ── Helpers para construir webhooks ──────────────────────────────

function makeTextWebhook(
  senderId: string,
  text: string
): InstagramWebhookPayload {
  return {
    object: "instagram",
    entry: [
      {
        id: "17841_PAGE_ID",
        time: 1735603200,
        messaging: [
          {
            sender: { id: senderId },
            recipient: { id: "17841_PAGE_ID" },
            timestamp: 1735603200000,
            message: {
              mid: `mid_${Date.now()}`,
              text,
            },
          },
        ],
      },
    ],
  };
}

function makeImageWebhook(
  senderId: string,
  imageUrl: string,
  caption = ""
): InstagramWebhookPayload {
  return {
    object: "instagram",
    entry: [
      {
        id: "17841_PAGE_ID",
        time: 1735603200,
        messaging: [
          {
            sender: { id: senderId },
            recipient: { id: "17841_PAGE_ID" },
            timestamp: 1735603200000,
            message: {
              mid: `mid_${Date.now()}_img`,
              text: caption || undefined,
              attachments: [
                { type: "image", payload: { url: imageUrl } },
              ],
            },
          },
        ],
      },
    ],
  };
}

// ── Tests inbound ────────────────────────────────────────────────

describe("transports/instagram — buildIncomingFromInstagram", () => {
  it("convierte texto correctamente", () => {
    const result = buildIncomingFromInstagram(
      makeTextWebhook("17841_USER_ABC", "hola, busco tela")
    );

    expect(result).toHaveLength(1);
    expect(result[0].channel).toBe("instagram");
    expect(result[0].type).toBe("text");
    expect(result[0].text).toBe("hola, busco tela");
    expect(result[0].from.id).toBe("ig:17841_USER_ABC");
  });

  it("convierte imagen con caption", () => {
    const result = buildIncomingFromInstagram(
      makeImageWebhook(
        "17841_USER",
        "https://scontent.cdninstagram.com/foto.jpg",
        "¿cuánto sale?"
      )
    );

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("image");
    expect(result[0].media?.url).toBe(
      "https://scontent.cdninstagram.com/foto.jpg"
    );
    expect(result[0].media?.caption).toBe("¿cuánto sale?");
  });

  it("IGNORA echoes (mensajes que enviamos nosotros)", () => {
    const payload: InstagramWebhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "PAGE",
          time: 0,
          messaging: [
            {
              sender: { id: "USER" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              message: {
                mid: "echo_mid",
                text: "respuesta del bot",
                is_echo: true,
              },
            },
          ],
        },
      ],
    };
    expect(buildIncomingFromInstagram(payload)).toHaveLength(0);
  });

  it("IGNORA delivery y read receipts", () => {
    const payload: InstagramWebhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "PAGE",
          time: 0,
          messaging: [
            {
              sender: { id: "USER" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              delivery: { mids: ["x"] },
            },
            {
              sender: { id: "USER" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              read: { mid: "y" },
            },
          ],
        },
      ],
    };
    expect(buildIncomingFromInstagram(payload)).toHaveLength(0);
  });

  it("IGNORA story replies (futuro)", () => {
    const payload: InstagramWebhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "PAGE",
          time: 0,
          messaging: [
            {
              sender: { id: "USER" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              message: {
                mid: "mid",
                text: "me gusta tu story",
                reply_to: { story: { id: "STORY_ID" } },
              },
            },
          ],
        },
      ],
    };
    expect(buildIncomingFromInstagram(payload)).toHaveLength(0);
  });

  it("payload con object distinto a 'instagram' → array vacío", () => {
    const payload = {
      object: "page", // es de Messenger, no IG
      entry: [],
    } as any;
    expect(buildIncomingFromInstagram(payload)).toHaveLength(0);
  });

  it("convierte quick_reply (botón clickeado) a interactive", () => {
    const payload: InstagramWebhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "PAGE",
          time: 0,
          messaging: [
            {
              sender: { id: "USER" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              message: {
                mid: "qr_mid",
                text: "Tarjeta",
                quick_reply: { payload: "pago_tarjeta" },
              },
            },
          ],
        },
      ],
    };
    const result = buildIncomingFromInstagram(payload);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("interactive");
    expect(result[0].interactive?.payload).toBe("pago_tarjeta");
    expect(result[0].interactive?.label).toBe("Tarjeta");
  });

  it("procesa múltiples mensajes en un solo webhook", () => {
    const payload: InstagramWebhookPayload = {
      object: "instagram",
      entry: [
        {
          id: "PAGE",
          time: 0,
          messaging: [
            {
              sender: { id: "USER_A" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              message: { mid: "m1", text: "hola" },
            },
            {
              sender: { id: "USER_B" },
              recipient: { id: "PAGE" },
              timestamp: 0,
              message: { mid: "m2", text: "qué tal" },
            },
          ],
        },
      ],
    };
    const result = buildIncomingFromInstagram(payload);
    expect(result).toHaveLength(2);
    expect(result[0].from.id).toBe("ig:USER_A");
    expect(result[1].from.id).toBe("ig:USER_B");
  });

  it("texto vacío → null", () => {
    const result = buildIncomingFromInstagram(makeTextWebhook("USER", "   "));
    expect(result).toHaveLength(0);
  });
});

// ── Tests outbound ───────────────────────────────────────────────

function fakeGraphResponse(messageId = "mid_response", ok = true): Response {
  if (!ok) {
    return new Response(
      JSON.stringify({ error: { message: "Invalid recipient" } }),
      { status: 400 }
    );
  }
  return new Response(
    JSON.stringify({ message_id: messageId, recipient_id: "USER" }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

describe("transports/instagram — sendToInstagram", () => {
  it("envía texto exitosamente", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeGraphResponse("mid_1"));

    const outgoing: OutgoingMessage = {
      channel: "instagram",
      to: { id: "ig:17841_USER" },
      type: "text",
      text: "Hola, soy El Coyote",
    };

    const result = await sendToInstagram(outgoing, fakeFetch as any);
    expect(result.status).toBe("sent");
    expect(result.channelMessageId).toBe("mid_1");

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.recipient.id).toBe("17841_USER");
    expect(body.message.text).toBe("Hola, soy El Coyote");
  });

  it("trunca texto a 1000 chars", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeGraphResponse());

    await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig:USER" },
        type: "text",
        text: "x".repeat(2000),
      },
      fakeFetch as any
    );

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.message.text.length).toBe(1000);
  });

  it("envía imagen", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeGraphResponse());

    const result = await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig:USER" },
        type: "image",
        media: { url: "https://x.com/foto.jpg" },
      },
      fakeFetch as any
    );

    expect(result.status).toBe("sent");
    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.message.attachment.type).toBe("image");
    expect(body.message.attachment.payload.url).toBe("https://x.com/foto.jpg");
  });

  it("interactive: convierte buttons a quick_replies", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(fakeGraphResponse());

    await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig:USER" },
        type: "interactive",
        interactive: {
          body: "¿Cómo pagar?",
          buttons: [
            { payload: "card", label: "Tarjeta" },
            { payload: "oxxo", label: "OXXO" },
          ],
        },
      },
      fakeFetch as any
    );

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.message.text).toBe("¿Cómo pagar?");
    expect(body.message.quick_replies).toHaveLength(2);
    expect(body.message.quick_replies[0].title).toBe("Tarjeta");
    expect(body.message.quick_replies[0].payload).toBe("card");
  });

  it("error HTTP 400 → failed", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(fakeGraphResponse(undefined, false));

    const result = await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig:USER" },
        type: "text",
        text: "x",
      },
      fakeFetch as any
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("400");
  });

  it("fetch tira → failed", async () => {
    const fakeFetch = vi.fn().mockRejectedValueOnce(new Error("network down"));

    const result = await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig:USER" },
        type: "text",
        text: "x",
      },
      fakeFetch as any
    );

    expect(result.status).toBe("failed");
    expect(result.error).toContain("network");
  });

  it("to.id con prefix 'ig_page:' → failed (es el ID de la página, no el del usuario)", async () => {
    const fakeFetch = vi.fn();
    const result = await sendToInstagram(
      {
        channel: "instagram",
        to: { id: "ig_page:17841_PAGE" },
        type: "text",
        text: "x",
      },
      fakeFetch as any
    );

    expect(result.status).toBe("failed");
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});

// ── Tests verify ─────────────────────────────────────────────────

describe("transports/instagram — verifyInstagramSignature", () => {
  const APP_SECRET = "test_app_secret"; // debe coincidir con el de vitest.config

  function sign(body: string, secret: string): string {
    return (
      "sha256=" +
      crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")
    );
  }

  it("acepta signature válida", () => {
    const body = '{"test":"payload"}';
    const sig = sign(body, APP_SECRET);
    expect(verifyInstagramSignature(body, sig)).toBe(true);
  });

  it("rechaza signature incorrecta", () => {
    const body = '{"test":"payload"}';
    const sig = sign(body, "secret_incorrecto");
    expect(verifyInstagramSignature(body, sig)).toBe(false);
  });

  it("rechaza si no hay header", () => {
    expect(verifyInstagramSignature("{}", null)).toBe(false);
  });

  it("rechaza header sin prefix sha256=", () => {
    expect(verifyInstagramSignature("{}", "abc123")).toBe(false);
  });

  it("rechaza si el body fue modificado", () => {
    const original = '{"test":"original"}';
    const sig = sign(original, APP_SECRET);
    const modificado = '{"test":"modificado"}';
    expect(verifyInstagramSignature(modificado, sig)).toBe(false);
  });
});

describe("transports/instagram — handleVerifyChallenge", () => {
  // El env de testing tiene INSTAGRAM_VERIFY_TOKEN="test_ig_verify_token"

  it("acepta challenge válido", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "test_ig_verify_token",
      "hub.challenge": "1234567890",
    });
    const result = handleVerifyChallenge(params);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.challenge).toBe("1234567890");
  });

  it("rechaza si verify_token no coincide", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong_token",
      "hub.challenge": "x",
    });
    const result = handleVerifyChallenge(params);
    expect(result.ok).toBe(false);
  });

  it("rechaza si hub.mode no es 'subscribe'", () => {
    const params = new URLSearchParams({
      "hub.mode": "unsubscribe",
      "hub.verify_token": "test_ig_verify_token",
      "hub.challenge": "x",
    });
    const result = handleVerifyChallenge(params);
    expect(result.ok).toBe(false);
  });

  it("rechaza si falta challenge", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "test_ig_verify_token",
    });
    const result = handleVerifyChallenge(params);
    expect(result.ok).toBe(false);
  });
});
