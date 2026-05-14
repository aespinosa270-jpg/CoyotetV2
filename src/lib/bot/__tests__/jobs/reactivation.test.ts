import { describe, it, expect, beforeEach, vi } from "vitest";
import { runReactivationJob } from "../../jobs/reactivation";
import { createFakeRedis } from "../helpers/fake-redis";

describe("jobs/reactivation V2 (con plantilla)", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
    vi.clearAllMocks();
  });

  async function setPerfil(telefono: string, perfil: any) {
    await env.redis.set(`v2:cliente:${telefono}`, {
      telefono,
      ...perfil,
    });
  }

  it("envía plantilla a clientes WhatsApp con compras >30d sin contacto", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
      segmento: "recurrente",
    });

    const mockSend = vi
      .fn()
      .mockResolvedValue({ ok: true, messageId: "wamid.xyz" });

    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.enviados).toBe(1);
    expect(result.candidatos).toBe(1);
    expect(mockSend).toHaveBeenCalledWith({
      to: "5215551111111",
      templateName: "bienvenida",
      language: "es",
    });

    // Verificar perfil actualizado
    const p = await env.redis.get<any>("v2:cliente:5215551111111");
    expect(p.segmento).toBe("inactivo");
    expect(p.ultimaReactivacion).toBeDefined();
  });

  it("NO envía a prospectos sin compras (totalCompras=0)", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 0,
    });

    const mockSend = vi.fn();
    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.enviados).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
    expect(result.detalles[0]?.accion).toBe("skipped_sin_compras");
  });

  it("NO envía a clientes que rechazaron consentimiento", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const vetoFuturo = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
      consentimientoPromociones: {
        estado: "rechazado",
        vetoHasta: vetoFuturo,
      },
    });

    const mockSend = vi.fn();
    await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(mockSend).not.toHaveBeenCalled();
  });

  it("respeta cooldown — no re-envía dentro de 15 días", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const hace5dias = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
      ultimaReactivacion: hace5dias,
    });

    const mockSend = vi.fn();
    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.saltados).toBeGreaterThanOrEqual(1);
    expect(mockSend).not.toHaveBeenCalled();
    expect(result.detalles[0]?.accion).toBe("skipped_cooldown");
  });

  it("re-envía después de 15 días", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const hace20dias = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
      ultimaReactivacion: hace20dias,
    });

    const mockSend = vi.fn().mockResolvedValue({ ok: true, messageId: "x" });
    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.enviados).toBe(1);
  });

  it("NO envía a clientes de canal web/telegram/instagram", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("web:abc-uuid", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
    });
    await setPerfil("tg:12345", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
    });

    const mockSend = vi.fn();
    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(mockSend).not.toHaveBeenCalled();
    expect(result.saltados).toBe(2);
  });

  it("dryRun=true no envía mensajes reales", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
    });

    const mockSend = vi.fn();
    const result = await runReactivationJob({
      redis: env.redis,
      dryRun: true,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.candidatos).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("error de envío se registra como error, sigue con los demás", async () => {
    const hace40dias = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    await setPerfil("5215551111111", {
      ultimoContacto: hace40dias,
      totalCompras: 5,
    });
    await setPerfil("5215552222222", {
      ultimoContacto: hace40dias,
      totalCompras: 3,
    });

    const mockSend = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "rate limit" })
      .mockResolvedValueOnce({ ok: true, messageId: "x" });

    const result = await runReactivationJob({
      redis: env.redis,
      sendTemplateImpl: mockSend as any,
    });

    expect(result.errores).toBe(1);
    expect(result.enviados).toBe(1);
  });
});
