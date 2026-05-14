import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  ejecutarObtenerInfoMembresias,
  ejecutarProponerMembresia,
} from "../../tools/membership-handlers";
import { createFakeRedis } from "../helpers/fake-redis";

vi.mock("../../observability/events");
vi.mock("../../repositories/client-repo", () => ({
  update: vi.fn().mockResolvedValue({}),
}));

import * as clientRepo from "../../repositories/client-repo";

function makeCtx(overrides: any = {}) {
  const { redis } = createFakeRedis();
  return {
    message: {
      from: { id: "5215551234567" },
      channel: "whatsapp",
      type: "text" as const,
      text: "test",
      id: "msg_1",
      receivedAt: new Date(),
      channelMessageId: "x",
      to: { id: "y" },
    } as any,
    redis,
    profile: {
      telefono: "5215551234567",
      membershipTracking: {},
      ...overrides.profile,
    },
    history: [],
    isAdmin: false,
    state: { shouldAbort: false },
    ...overrides,
  };
}

describe("tools/membership — ejecutarObtenerInfoMembresias", () => {
  it("retorna TODOS los planes por default", async () => {
    const result = (await ejecutarObtenerInfoMembresias(
      {},
      makeCtx()
    )) as any;
    expect(result.planes).toHaveLength(4);
    expect(result.url_inscripcion).toBe(
      "https://www.coyotetextil.com/membresia"
    );
  });

  it("retorna TODOS si se pasa 'TODOS' explícito", async () => {
    const result = (await ejecutarObtenerInfoMembresias(
      { plan_especifico: "TODOS" },
      makeCtx()
    )) as any;
    expect(result.planes).toHaveLength(4);
  });

  it("retorna solo el plan específico si se pasa GOLD", async () => {
    const result = (await ejecutarObtenerInfoMembresias(
      { plan_especifico: "GOLD" },
      makeCtx()
    )) as any;
    expect(result.plan).toBeDefined();
    expect(result.plan.tier).toBe("GOLD");
    expect(result.plan.precioMensual).toBe(299);
    expect(result.planes).toBeUndefined();
  });

  it("retorna solo ELITE si se pide", async () => {
    const result = (await ejecutarObtenerInfoMembresias(
      { plan_especifico: "ELITE" },
      makeCtx()
    )) as any;
    expect(result.plan.tier).toBe("ELITE");
    expect(result.plan.precioMensual).toBe(1129);
  });

  it("retorna URL de inscripción en todos los casos", async () => {
    const r1 = (await ejecutarObtenerInfoMembresias({}, makeCtx())) as any;
    const r2 = (await ejecutarObtenerInfoMembresias(
      { plan_especifico: "GOLD" },
      makeCtx()
    )) as any;
    expect(r1.url_inscripcion).toBe("https://www.coyotetextil.com/membresia");
    expect(r2.url_inscripcion).toBe("https://www.coyotetextil.com/membresia");
  });
});

describe("tools/membership — ejecutarProponerMembresia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza tracking con vecesPropuesta+1", async () => {
    const result = (await ejecutarProponerMembresia(
      { plan_propuesto: "GOLD", motivo: "objecion_precio" },
      makeCtx()
    )) as any;

    expect(result.ok).toBe(true);
    expect(clientRepo.update).toHaveBeenCalledTimes(1);
    const updateArgs = vi.mocked(clientRepo.update).mock.calls[0];
    expect(updateArgs[0]).toBe("5215551234567");
    const tracking = (updateArgs[1] as any).membershipTracking;
    expect(tracking.vecesPropuesta).toBe(1);
    expect(tracking.ultimoPlanPropuesto).toBe("GOLD");
    expect(tracking.ultimoMotivo).toBe("objecion_precio");
  });

  it("incrementa vecesPropuesta si ya existía tracking previo", async () => {
    await ejecutarProponerMembresia(
      { plan_propuesto: "BLACK", motivo: "compras_acumuladas" },
      makeCtx({
        profile: {
          telefono: "521",
          membershipTracking: { vecesPropuesta: 2, ultimaPropuesta: "old" },
        },
      })
    );

    const tracking = (vi.mocked(clientRepo.update).mock.calls[0][1] as any)
      .membershipTracking;
    expect(tracking.vecesPropuesta).toBe(3);
  });

  it("guarda timestamp ISO en ultimaPropuesta", async () => {
    await ejecutarProponerMembresia(
      { plan_propuesto: "GOLD", motivo: "interes_explicito" },
      makeCtx()
    );

    const tracking = (vi.mocked(clientRepo.update).mock.calls[0][1] as any)
      .membershipTracking;
    expect(tracking.ultimaPropuesta).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("retorna URL para que el LLM la incluya en la respuesta", async () => {
    const result = (await ejecutarProponerMembresia(
      { plan_propuesto: "ELITE", motivo: "compras_acumuladas" },
      makeCtx()
    )) as any;
    expect(result.url_compartida).toBe(
      "https://www.coyotetextil.com/membresia"
    );
  });

  it("si clientRepo.update falla, retorna error sin tirar", async () => {
    vi.mocked(clientRepo.update).mockRejectedValueOnce(
      new Error("redis caído")
    );

    const result = (await ejecutarProponerMembresia(
      { plan_propuesto: "GOLD", motivo: "objecion_precio" },
      makeCtx()
    )) as any;

    expect(result.ok).toBe(false);
    expect(result.error).toBeDefined();
  });
});
