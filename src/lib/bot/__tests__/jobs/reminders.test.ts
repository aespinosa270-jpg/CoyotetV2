import { describe, it, expect, beforeEach } from "vitest";
import { runRemindersJob } from "../../jobs/reminders";
import { createFakeRedis } from "../helpers/fake-redis";

describe("jobs/reminders V2 (marca flag, no envía plantilla)", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
  });

  async function setupCliente(
    telefono: string,
    perfil: any,
    pedidos: any[]
  ) {
    await env.redis.set(`v2:cliente:${telefono}`, { telefono, ...perfil });
    await env.redis.set(`v2:pedidos:${telefono}`, pedidos);
  }

  it("marca flag a clientes con pendientes >24h", async () => {
    const hace2dias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace2dias }]
    );

    const result = await runRemindersJob({ redis: env.redis });

    expect(result.marcados).toBe(1);
    expect(result.candidatos).toBe(1);

    const p = await env.redis.get<any>("v2:cliente:5215551111111");
    expect(p.pedidoPendienteFlag).toBe(true);
    expect(p.pedidoPendienteMonto).toBe(5000);
    expect(p.pedidoPendienteFlagDesde).toBeDefined();
  });

  it("setea cooldown de 24h después del primer mark", async () => {
    const hace2dias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace2dias }]
    );

    await runRemindersJob({ redis: env.redis });

    const cooldown = await env.redis.get(
      "v2:reminder:cooldown:5215551111111"
    );
    expect(cooldown).toBe("1");
  });

  it("respeta cooldown — no re-marca dentro de 24h", async () => {
    const hace2dias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace2dias }]
    );
    await env.redis.set("v2:reminder:cooldown:5215551111111", "1");

    const result = await runRemindersJob({ redis: env.redis });

    expect(result.marcados).toBe(0);
    expect(result.saltados).toBe(1);
  });

  it("dryRun=true no modifica el perfil ni setea cooldown", async () => {
    const hace2dias = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace2dias }]
    );

    const result = await runRemindersJob({ redis: env.redis, dryRun: true });

    expect(result.marcados).toBe(1);
    const p = await env.redis.get<any>("v2:cliente:5215551111111");
    expect(p.pedidoPendienteFlag).toBeUndefined();
    const cd = await env.redis.get("v2:reminder:cooldown:5215551111111");
    expect(cd).toBeNull();
  });

  it("ignora pedidos pendientes <24h", async () => {
    const hace5h = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace5h }]
    );

    const result = await runRemindersJob({ redis: env.redis });

    expect(result.candidatos).toBe(0);
  });

  it("ignora pedidos pagados", async () => {
    const hace2d = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pagado", total: 5000, timestamp: hace2d }]
    );

    const result = await runRemindersJob({ redis: env.redis });

    expect(result.candidatos).toBe(0);
  });

  it("acepta horasPendienteMin custom", async () => {
    const hace10h = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "5215551111111",
      { nombre: "Juan" },
      [{ status: "pendiente_pago", total: 5000, timestamp: hace10h }]
    );

    const result = await runRemindersJob({
      redis: env.redis,
      horasPendienteMin: 6,
    });

    expect(result.candidatos).toBe(1);
  });

  it("sin clientes, retorna ceros", async () => {
    const result = await runRemindersJob({ redis: env.redis });
    expect(result.candidatos).toBe(0);
    expect(result.marcados).toBe(0);
    expect(result.errores).toBe(0);
  });

  it("incluye clientes web también (no solo WhatsApp)", async () => {
    const hace2d = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await setupCliente(
      "web:abc-uuid",
      { nombre: "WebUser" },
      [{ status: "pendiente_pago", total: 1000, timestamp: hace2d }]
    );

    const result = await runRemindersJob({ redis: env.redis });

    expect(result.candidatos).toBe(1);
    expect(result.marcados).toBe(1);
  });
});
