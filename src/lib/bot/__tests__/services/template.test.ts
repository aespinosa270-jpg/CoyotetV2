import { describe, it, expect, vi } from "vitest";
import { sendTemplate, TEMPLATES } from "../../services/meta/template";

function fakeResponse(body: any, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("services/meta/template — sendTemplate", () => {
  it("envía plantilla sin parámetros (caso bienvenida)", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(
      fakeResponse({
        messages: [{ id: "wamid.abc123" }],
      })
    );

    const result = await sendTemplate(
      {
        to: "5215551234567",
        templateName: TEMPLATES.BIENVENIDA.name,
        language: TEMPLATES.BIENVENIDA.language,
      },
      fakeFetch as any
    );

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe("wamid.abc123");

    // Verificar payload enviado a Meta
    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.messaging_product).toBe("whatsapp");
    expect(body.to).toBe("525551234567");
    expect(body.type).toBe("template");
    expect(body.template.name).toBe("bienvenida");
    expect(body.template.language.code).toBe("es");
    // Sin variables, no debe haber components
    expect(body.template.components).toBeUndefined();
  });

  it("envía plantilla CON parámetros", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(
        fakeResponse({ messages: [{ id: "wamid.x" }] })
      );

    await sendTemplate(
      {
        to: "5215551234567",
        templateName: "test_template",
        bodyParameters: [
          { type: "text", text: "Juan" },
          { type: "text", text: "$5,000" },
        ],
      },
      fakeFetch as any
    );

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.template.components).toHaveLength(1);
    expect(body.template.components[0].type).toBe("body");
    expect(body.template.components[0].parameters).toHaveLength(2);
    expect(body.template.components[0].parameters[0].text).toBe("Juan");
  });

  it("normaliza 521... a 52...", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(
        fakeResponse({ messages: [{ id: "x" }] })
      );

    await sendTemplate(
      { to: "5215551111111", templateName: "bienvenida" },
      fakeFetch as any
    );

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.to).toBe("525551111111");
  });

  it("error de Meta retorna ok=false con código", async () => {
    const fakeFetch = vi.fn().mockResolvedValueOnce(
      fakeResponse(
        {
          error: {
            code: 132001,
            message: "Template name does not exist in the translation",
            type: "OAuthException",
          },
        },
        400
      )
    );

    const result = await sendTemplate(
      { to: "5215551234567", templateName: "no_existe" },
      fakeFetch as any
    );

    expect(result.ok).toBe(false);
    expect(result.errorCode).toBe(132001);
    expect(result.error).toContain("Template name");
  });

  it("excepción de red retorna ok=false", async () => {
    const fakeFetch = vi.fn().mockRejectedValueOnce(new Error("network down"));

    const result = await sendTemplate(
      { to: "5215551234567", templateName: "bienvenida" },
      fakeFetch as any
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("network");
  });

  it("usa META_GRAPH_API_VERSION del env", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(
        fakeResponse({ messages: [{ id: "x" }] })
      );

    await sendTemplate(
      { to: "5215551234567", templateName: "bienvenida" },
      fakeFetch as any
    );

    const url = fakeFetch.mock.calls[0][0];
    // El test env tiene META_GRAPH_API_VERSION default "v22.0"
    expect(url).toContain("graph.facebook.com");
    expect(url).toContain("/messages");
  });

  it("idioma default es 'es' si no se pasa", async () => {
    const fakeFetch = vi
      .fn()
      .mockResolvedValueOnce(
        fakeResponse({ messages: [{ id: "x" }] })
      );

    await sendTemplate(
      { to: "5215551234567", templateName: "bienvenida" },
      fakeFetch as any
    );

    const body = JSON.parse(fakeFetch.mock.calls[0][1].body);
    expect(body.template.language.code).toBe("es");
  });
});

describe("TEMPLATES — catálogo de plantillas registradas", () => {
  it("incluye BIENVENIDA con nombre y lenguaje correctos", () => {
    expect(TEMPLATES.BIENVENIDA.name).toBe("bienvenida");
    expect(TEMPLATES.BIENVENIDA.language).toBe("es");
    expect(TEMPLATES.BIENVENIDA.requiresParams).toBe(false);
  });
});

