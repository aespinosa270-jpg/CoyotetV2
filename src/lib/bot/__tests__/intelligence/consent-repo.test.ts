import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getConsentInfo,
  marcarOtorgado,
  marcarRechazado,
  marcarPendiente,
} from "../../repositories/consent-repo";
import { createFakeRedis } from "../helpers/fake-redis";

vi.mock("../../repositories/client-repo", () => ({
  update: vi.fn().mockImplementation(async (_phone, patch) => patch),
}));

import * as clientRepo from "../../repositories/client-repo";

describe("repositories/consent-repo — getConsentInfo", () => {
  it("default no_solicitado si no hay info en el perfil", () => {
    expect(getConsentInfo({})).toEqual({ estado: "no_solicitado" });
    expect(getConsentInfo({ consentimientoPromociones: null })).toEqual({
      estado: "no_solicitado",
    });
  });

  it("lee estado otorgado del perfil", () => {
    const info = getConsentInfo({
      consentimientoPromociones: {
        estado: "otorgado",
        timestamp: "2026-05-12T00:00:00.000Z",
        versionTerminos: "2026-05",
      },
    });
    expect(info.estado).toBe("otorgado");
  });

  it("si rechazo expiró (>6 meses), vuelve a no_solicitado", () => {
    const hace7meses = new Date(
      Date.now() - 7 * 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const info = getConsentInfo({
      consentimientoPromociones: {
        estado: "rechazado",
        vetoHasta: hace7meses,
      },
    });
    expect(info.estado).toBe("no_solicitado");
  });

  it("rechazo vigente sigue siendo rechazado", () => {
    const enUnMes = new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    const info = getConsentInfo({
      consentimientoPromociones: {
        estado: "rechazado",
        vetoHasta: enUnMes,
      },
    });
    expect(info.estado).toBe("rechazado");
  });

  it("si versión de términos cambió, re-solicitar", () => {
    const info = getConsentInfo({
      consentimientoPromociones: {
        estado: "otorgado",
        versionTerminos: "2024-01", // versión vieja
      },
    });
    expect(info.estado).toBe("no_solicitado");
  });
});

describe("repositories/consent-repo — marcar*", () => {
  let env: ReturnType<typeof createFakeRedis>;

  beforeEach(() => {
    env = createFakeRedis();
    vi.clearAllMocks();
  });

  it("marcarOtorgado escribe estado otorgado + versión", async () => {
    await marcarOtorgado("521", env.redis);
    expect(clientRepo.update).toHaveBeenCalledWith(
      "521",
      expect.objectContaining({
        consentimientoPromociones: expect.objectContaining({
          estado: "otorgado",
          versionTerminos: "2026-05",
        }),
      }),
      env.redis
    );
  });

  it("marcarRechazado escribe veto a +6 meses", async () => {
    const antes = Date.now();
    await marcarRechazado("521", env.redis);
    const after = Date.now();

    const patch = vi.mocked(clientRepo.update).mock.calls[0][1] as any;
    const info = patch.consentimientoPromociones;

    expect(info.estado).toBe("rechazado");
    expect(info.vetoHasta).toBeDefined();

    const vetoMs = new Date(info.vetoHasta).getTime();
    const seisMeses = 6 * 30 * 24 * 60 * 60 * 1000;
    expect(vetoMs).toBeGreaterThanOrEqual(antes + seisMeses - 1000);
    expect(vetoMs).toBeLessThanOrEqual(after + seisMeses + 1000);
  });

  it("marcarPendiente escribe estado pendiente", async () => {
    await marcarPendiente("521", env.redis);
    const patch = vi.mocked(clientRepo.update).mock.calls[0][1] as any;
    expect(patch.consentimientoPromociones.estado).toBe("pendiente");
  });
});
