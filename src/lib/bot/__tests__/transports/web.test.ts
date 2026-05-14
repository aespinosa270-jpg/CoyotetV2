import { describe, it, expect } from "vitest";
import {
  buildIncomingFromWeb,
  validateWebPayload,
} from "../../transports/web/inbound";
import { buildWebResponse } from "../../transports/web/outbound";
import type { OutgoingMessage } from "../../types/messages";

describe("transports/web — validateWebPayload", () => {
  it("acepta payload válido", () => {
    expect(
      validateWebPayload({
        sessionId: "abc12345-1234-1234-1234-123456789012",
        message: "hola",
      })
    ).toBeNull();
  });

  it("rechaza payload sin sessionId", () => {
    expect(validateWebPayload({ message: "hola" })).toContain("sessionId");
  });

  it("rechaza sessionId muy corto", () => {
    expect(
      validateWebPayload({ sessionId: "abc", message: "hola" })
    ).toContain("mínimo 8");
  });

  it("rechaza sessionId demasiado largo", () => {
    expect(
      validateWebPayload({
        sessionId: "x".repeat(200),
        message: "hola",
      })
    ).toContain("demasiado largo");
  });

  it("rechaza message vacío", () => {
    expect(
      validateWebPayload({ sessionId: "abc12345", message: "   " })
    ).toContain("vacío");
  });

  it("rechaza message no string", () => {
    expect(
      validateWebPayload({ sessionId: "abc12345", message: 123 })
    ).toContain("string");
  });

  it("rechaza message demasiado largo", () => {
    expect(
      validateWebPayload({
        sessionId: "abc12345",
        message: "x".repeat(5000),
      })
    ).toContain("demasiado largo");
  });

  it("rechaza payload no objeto", () => {
    expect(validateWebPayload(null)).toContain("inválido");
    expect(validateWebPayload("string")).toContain("inválido");
    expect(validateWebPayload(123)).toContain("inválido");
  });
});

describe("transports/web — buildIncomingFromWeb", () => {
  it("construye IncomingMessage válido", () => {
    const result = buildIncomingFromWeb(
      {
        sessionId: "abc12345-1234-1234-1234-123456789012",
        message: "hola, necesito una tela",
      },
      "req_test_123"
    );

    expect(result.channel).toBe("web");
    expect(result.type).toBe("text");
    expect(result.text).toBe("hola, necesito una tela");
    expect(result.id).toBe("req_test_123");
    expect(result.channelMessageId).toBe("req_test_123");
  });

  it("prefija el clientId con 'web:' para distinguir de teléfonos", () => {
    const result = buildIncomingFromWeb(
      { sessionId: "abc12345", message: "x" },
      "req_1"
    );
    expect(result.from.id).toBe("web:abc12345");
  });

  it("incluye clientName si vino en el payload", () => {
    const result = buildIncomingFromWeb(
      { sessionId: "abc12345", message: "x", clientName: "Pedro" },
      "req_1"
    );
    expect(result.from.displayName).toBe("Pedro");
  });

  it("recorta whitespace del mensaje", () => {
    const result = buildIncomingFromWeb(
      { sessionId: "abc12345", message: "   hola   " },
      "req_1"
    );
    expect(result.text).toBe("hola");
  });

  it("preserva clientTimestamp si viene", () => {
    const ts = "2026-05-12T10:30:00.000Z";
    const result = buildIncomingFromWeb(
      { sessionId: "abc12345", message: "x", clientTimestamp: ts },
      "req_1"
    );
    expect(result.receivedAt.toISOString()).toBe(ts);
  });
});

describe("transports/web — buildWebResponse", () => {
  it("convierte mensajes de texto", () => {
    const outgoing: OutgoingMessage[] = [
      {
        channel: "web",
        to: { id: "web:abc" },
        type: "text",
        text: "Hola, soy El Coyote",
      },
    ];
    const result = buildWebResponse(outgoing);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toEqual({
      type: "text",
      text: "Hola, soy El Coyote",
    });
  });

  it("convierte múltiples mensajes", () => {
    const outgoing: OutgoingMessage[] = [
      {
        channel: "web",
        to: { id: "web:abc" },
        type: "text",
        text: "uno",
      },
      {
        channel: "web",
        to: { id: "web:abc" },
        type: "text",
        text: "dos",
      },
    ];
    const result = buildWebResponse(outgoing);
    expect(result.messages).toHaveLength(2);
    expect(result.messages[0].text).toBe("uno");
    expect(result.messages[1].text).toBe("dos");
  });

  it("convierte mensaje tipo image", () => {
    const outgoing: OutgoingMessage[] = [
      {
        channel: "web",
        to: { id: "web:abc" },
        type: "image",
        media: { url: "https://x.com/foto.jpg", caption: "Ejemplo" },
      },
    ];
    const result = buildWebResponse(outgoing);
    expect(result.messages[0].type).toBe("image");
    expect(result.messages[0].imageUrl).toBe("https://x.com/foto.jpg");
    expect(result.messages[0].text).toBe("Ejemplo");
  });

  it("convierte mensaje interactivo con botones", () => {
    const outgoing: OutgoingMessage[] = [
      {
        channel: "web",
        to: { id: "web:abc" },
        type: "interactive",
        interactive: {
          body: "¿Cómo desea pagar?",
          buttons: [
            { payload: "card", label: "Tarjeta" },
            { payload: "oxxo", label: "OXXO" },
          ],
        },
      },
    ];
    const result = buildWebResponse(outgoing);
    expect(result.messages[0].type).toBe("interactive");
    expect(result.messages[0].buttons).toHaveLength(2);
    expect(result.messages[0].text).toBe("¿Cómo desea pagar?");
  });

  it("array vacío → mensajes vacío sin romper", () => {
    expect(buildWebResponse([])).toEqual({ messages: [] });
  });
});
