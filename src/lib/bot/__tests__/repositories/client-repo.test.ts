import { describe, it, expect, beforeEach } from "vitest";
import { createFakeRedis } from "../helpers/fake-redis";
import * as clientRepo from "../../repositories/client-repo";
import type { PedidoRegistro, Recordatorio } from "../../types/domain";

const phone = "5215551234567";

function makePedido(monto: number, conFactura = false): PedidoRegistro {
  return {
    fecha: new Date().toISOString(),
    productos: "tela alaska 25kg",
    monto,
    metodo: "card",
    conFactura,
  };
}

describe("client-repo", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
  });

  // ── Lectura / creación ────────────────────────────────────────

  it("findByPhone devuelve null si no existe", async () => {
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli).toBeNull();
  });

  it("findOrCreate crea perfil con defaults sanos", async () => {
    const cli = await clientRepo.findOrCreate(phone, env.redis);
    expect(cli.telefono).toBe(phone);
    expect(cli.totalCompras).toBe(0);
    expect(cli.montoAcumulado).toBe(0);
    expect(cli.segmento).toBe("prospecto");
    expect(cli.privacidadRespondida).toBe(false);
    expect(cli.terminosAceptados).toBe(false);
    expect(cli.temperaturaCompra).toBeGreaterThan(0);
  });

  it("findOrCreate persiste el perfil para futuras llamadas", async () => {
    const cli1 = await clientRepo.findOrCreate(phone, env.redis);
    const cli2 = await clientRepo.findByPhone(phone, env.redis);
    expect(cli2).not.toBeNull();
    expect(cli2!.primerContacto).toBe(cli1.primerContacto);
  });

  // ── Validación zod ────────────────────────────────────────────

  it("save valida campos críticos", async () => {
    const cli = clientRepo.buildNewProfile(phone);
    // Forzar un valor inválido
    (cli as any).totalCompras = -5;
    await expect(clientRepo.save(cli, env.redis)).rejects.toThrow();
  });

  it("save permite campos extras (passthrough)", async () => {
    const cli = clientRepo.buildNewProfile(phone);
    (cli as any).campoNuevoFuturo = "ok";
    await expect(clientRepo.save(cli, env.redis)).resolves.not.toThrow();
  });

  // ── Update ────────────────────────────────────────────────────

  it("update mergea cambios y actualiza ultimoContacto", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    const before = await clientRepo.findByPhone(phone, env.redis);
    await new Promise((r) => setTimeout(r, 10)); // forzar diff de timestamp
    const after = await clientRepo.update(
      phone,
      { nombre: "Juan", direccionEnvio: "Reforma 100" },
      env.redis
    );
    expect(after.nombre).toBe("Juan");
    expect(after.direccionEnvio).toBe("Reforma 100");
    expect(after.ultimoContacto).not.toBe(before!.ultimoContacto);
  });

  it("update lanza si el cliente no existe", async () => {
    await expect(
      clientRepo.update(phone, { nombre: "X" }, env.redis)
    ).rejects.toThrow("Cliente no encontrado");
  });

  // ── registrarPedido ──────────────────────────────────────────

  it("registrarPedido incrementa totales y promedia el ticket", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.registrarPedido(phone, makePedido(1000), env.redis);
    await clientRepo.registrarPedido(phone, makePedido(2000), env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.totalCompras).toBe(2);
    expect(cli!.montoAcumulado).toBe(3000);
    expect(cli!.ticketPromedio).toBe(1500);
  });

  it("registrarPedido sube a vip al llegar a 5 compras", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    for (let i = 0; i < 5; i++) {
      await clientRepo.registrarPedido(phone, makePedido(500), env.redis);
    }
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.segmento).toBe("vip");
  });

  it("registrarPedido sube a vip si monto acumulado >= 10000", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.registrarPedido(phone, makePedido(12000), env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.segmento).toBe("vip");
  });

  it("registrarPedido resetea estado de venta y membresía ofrecida", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.update(
      phone,
      {
        intentosDePago: 3,
        etapaAbandono: "pago",
        membresiaOfrecida: true,
      },
      env.redis
    );
    await clientRepo.registrarPedido(phone, makePedido(500), env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.intentosDePago).toBe(0);
    expect(cli!.etapaAbandono).toBeNull();
    expect(cli!.membresiaOfrecida).toBe(false);
  });

  it("registrarPedido marca requiereFrecuenteFactura si pidió factura", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.registrarPedido(phone, makePedido(1000, true), env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.requiereFrecuenteFactura).toBe(true);
  });

  // ── Helpers atómicos ─────────────────────────────────────────

  it("setTerminosAceptados marca el flag", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.setTerminosAceptados(phone, env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.terminosAceptados).toBe(true);
  });

  it("setMembresiaActiva guarda el plan", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.setMembresiaActiva(phone, "BLACK", env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.tieneSuscripcion).toBe(true);
    expect(cli!.planMembresia).toBe("BLACK");
  });

  it("setTactica clamp temperatura a [0, 100]", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.setTactica(phone, "cierre_directo", 150, env.redis);
    let cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.temperaturaCompra).toBe(100);

    await clientRepo.setTactica(phone, "manejo_objecion", -10, env.redis);
    cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.temperaturaCompra).toBe(0);
  });

  // ── Recordatorios ────────────────────────────────────────────

  it("addRecordatorio agrega a la lista de pendientes", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    const r: Recordatorio = {
      tipo: "reactivacion",
      fecha: "2030-01-01T00:00:00Z",
      mensaje: "retomar cotización",
    };
    await clientRepo.addRecordatorio(phone, r, env.redis);
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.recordatoriosPendientes).toHaveLength(1);
    expect(cli!.recordatoriosPendientes[0].mensaje).toBe(
      "retomar cotización"
    );
  });

  it("removeRecordatoriosVencidos separa vencidos y mantiene vigentes", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    await clientRepo.addRecordatorio(
      phone,
      { tipo: "custom", fecha: "2020-01-01T00:00:00Z", mensaje: "vencido" },
      env.redis
    );
    await clientRepo.addRecordatorio(
      phone,
      { tipo: "custom", fecha: "2099-01-01T00:00:00Z", mensaje: "vigente" },
      env.redis
    );
    const vencidos = await clientRepo.removeRecordatoriosVencidos(
      phone,
      env.redis
    );
    expect(vencidos).toHaveLength(1);
    expect(vencidos[0].mensaje).toBe("vencido");
    const cli = await clientRepo.findByPhone(phone, env.redis);
    expect(cli!.recordatoriosPendientes).toHaveLength(1);
    expect(cli!.recordatoriosPendientes[0].mensaje).toBe("vigente");
  });

  // ── Delete ───────────────────────────────────────────────────

  it("deleteByPhone borra el perfil", async () => {
    await clientRepo.findOrCreate(phone, env.redis);
    expect(await clientRepo.deleteByPhone(phone, env.redis)).toBe(true);
    expect(await clientRepo.findByPhone(phone, env.redis)).toBeNull();
  });
});
