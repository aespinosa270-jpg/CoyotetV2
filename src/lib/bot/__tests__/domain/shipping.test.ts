import { describe, it, expect } from "vitest";
import {
  calcularEnvio,
  type ProductoEnvio,
} from "../../domain/shipping/calculator";
import { resolverZona } from "../../domain/shipping/zones";

// ── Helpers ────────────────────────────────────────────────────────

function makeProducts(
  ...specs: Array<{ kg: number; nombre?: string }>
): ProductoEnvio[] {
  return specs.map((s, i) => ({
    nombre: s.nombre ?? `producto-${i}`,
    kg: s.kg,
  }));
}

// ── Resolver zona ──────────────────────────────────────────────────

describe("shipping/zones — resolverZona", () => {
  it("CDMX Centro (CP 06000) → COYOTE 5 km", () => {
    const z = resolverZona("06000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(5);
    expect(z.etiqueta).toContain("Centro");
  });

  it("CDMX Polanco (CP 11000) → COYOTE 18 km", () => {
    const z = resolverZona("11000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(18);
  });

  it("Naucalpan Edomex (CP 53000) → COYOTE 25 km", () => {
    const z = resolverZona("53000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(25);
  });

  it("Toluca (CP 50000) → COYOTE 70 km", () => {
    const z = resolverZona("50000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(70);
  });

  it("Puebla (CP 72000) → COYOTE 130 km", () => {
    const z = resolverZona("72000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(130);
  });

  it("Cuernavaca (CP 62000) → COYOTE 90 km", () => {
    const z = resolverZona("62000");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(90);
  });

  it("Querétaro (CP 76000) → SKYDROPX (fuera de zona)", () => {
    const z = resolverZona("76000");
    expect(z.tipo).toBe("SKYDROPX");
    expect(z.distanciaKm).toBe(0);
  });

  it("CP inválido (texto) → SKYDROPX", () => {
    const z = resolverZona("abc");
    expect(z.tipo).toBe("SKYDROPX");
  });

  it("CP con guiones se limpia (06-100 → 06100)", () => {
    const z = resolverZona("06-100");
    expect(z.tipo).toBe("COYOTE");
    expect(z.distanciaKm).toBe(5);
  });

  it("CP demasiado corto se rellena con ceros a la izquierda", () => {
    const z = resolverZona("100");
    // 00100 → prefix2 = 0 → no en ningún rango → SKYDROPX
    expect(z.tipo).toBe("SKYDROPX");
  });
});

// ── Cálculo de flete (escalonado) ──────────────────────────────────

describe("shipping/calculator — flete escalonado", () => {
  const cp = "06000"; // CDMX Centro, 5 km
  const subtotal = 1000;
  const requiereFactura = false;

  it("5 kg, 1 rollo → flete 150 (peso < 10 y 1 rollo)", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 5 }),
      cp,
      subtotal,
      requiereFactura,
    });
    expect(r.flete).toBe(150);
    expect(r.totalRollos).toBe(1);
  });

  it("25 kg = 1 rollo → flete 200 (peso ≥ 10 con 1 rollo)", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp,
      subtotal,
      requiereFactura,
    });
    expect(r.flete).toBe(200);
    expect(r.totalRollos).toBe(1);
  });

  it("100 kg = 4 rollos → flete 250", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 100 }),
      cp,
      subtotal,
      requiereFactura,
    });
    expect(r.flete).toBe(250);
    expect(r.totalRollos).toBe(4);
  });

  it("250 kg = 10 rollos → flete 300", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 250 }),
      cp,
      subtotal,
      requiereFactura,
    });
    expect(r.flete).toBe(300);
    expect(r.totalRollos).toBe(10);
  });

  it("525 kg = 21 rollos → flete 1000 (sobre umbral)", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 525 }),
      cp,
      subtotal,
      requiereFactura,
    });
    expect(r.flete).toBe(1000);
    expect(r.totalRollos).toBe(21);
  });
});

// ── Traslado COYOTE (combustible) ──────────────────────────────────

describe("shipping/calculator — traslado COYOTE", () => {
  it("5 km a CDMX Centro: traslado proporcional al diésel", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: false,
    });
    // 5 km × 2 (ida+vuelta) = 10 km. 10/100 × 20 L = 2 L.
    // 2 L × 27 MXN/L × 4 (markup) × 1 vehículo = 216 MXN
    expect(r.traslado).toBeCloseTo(216, 1);
    expect(r.vehiculos).toBe(1);
  });

  it("130 km a Puebla con 1 vehículo", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "72000",
      subtotal: 1000,
      requiereFactura: false,
    });
    // 130 × 2 = 260 km. 260/100 × 20 = 52 L. 52 × 27 × 4 × 1 = 5616
    expect(r.traslado).toBeCloseTo(5616, 1);
  });

  it("Pedido grande requiere múltiples vehículos (90 rollos)", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 90 * 25 }), // 2250 kg = 90 rollos
      cp: "06000",
      subtotal: 100000,
      requiereFactura: false,
    });
    // 90 rollos / 80 (max por vehículo) = 2 vehículos
    expect(r.vehiculos).toBe(2);
    // Traslado se duplica: 216 × 2 = 432
    expect(r.traslado).toBeCloseTo(432, 1);
  });
});

// ── Traslado SKYDROPX (paquetería) ─────────────────────────────────

describe("shipping/calculator — traslado SKYDROPX", () => {
  it("Pedido pequeño (3 kg) a Querétaro: 180 base", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 3 }),
      cp: "76000",
      subtotal: 500,
      requiereFactura: false,
    });
    expect(r.tipoEnvio).toBe("SKYDROPX");
    expect(r.traslado).toBe(180);
  });

  it("Pedido mediano (10 kg) a Querétaro: 180 + 5×12 = 240", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 10 }),
      cp: "76000",
      subtotal: 1000,
      requiereFactura: false,
    });
    expect(r.tipoEnvio).toBe("SKYDROPX");
    expect(r.traslado).toBe(240);
  });
});

// ── IVA / Factura ──────────────────────────────────────────────────

describe("shipping/calculator — IVA", () => {
  it("Sin factura → IVA 0", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: false,
    });
    expect(r.iva).toBe(0);
    expect(r.total).toBeCloseTo(r.base, 1);
  });

  it("Con factura → IVA 16% sobre base", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: true,
    });
    expect(r.iva).toBeCloseTo(r.base * 0.16, 1);
    expect(r.total).toBeCloseTo(r.base * 1.16, 1);
  });
});

// ── Edge cases ─────────────────────────────────────────────────────

describe("shipping/calculator — edge cases", () => {
  it("CP inválido marca cpEraInvalido y usa fallback", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "abc",
      subtotal: 1000,
      requiereFactura: false,
    });
    expect(r.cpEraInvalido).toBe(true);
    expect(r.cpUsado).toBe("99999");
    expect(r.tipoEnvio).toBe("SKYDROPX");
  });

  it("Lista vacía de productos → 1 rollo mínimo, flete 150", () => {
    const r = calcularEnvio({
      productos: [],
      cp: "06000",
      subtotal: 0,
      requiereFactura: false,
    });
    expect(r.totalKilos).toBe(0);
    expect(r.totalRollos).toBe(1);
    expect(r.flete).toBe(150);
  });

  it("Producto con kgPorRollo custom (Flanel = 27 kg)", () => {
    const r = calcularEnvio({
      productos: [{ nombre: "flanel", kg: 27, kgPorRollo: 27 }],
      cp: "06000",
      subtotal: 1000,
      requiereFactura: false,
    });
    // 27 kg en rollos de 27 kg = 1 rollo (no 2)
    expect(r.totalRollos).toBe(1);
  });

  it("Total redondeado a 2 decimales", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: true,
    });
    // El total debe tener máximo 2 decimales
    const totalStr = r.total.toString();
    const decimales = totalStr.includes(".")
      ? totalStr.split(".")[1].length
      : 0;
    expect(decimales).toBeLessThanOrEqual(2);
  });

  it("Desglose contiene todas las líneas esperadas", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: true,
    });
    expect(r.desglose).toContain("Subtotal productos");
    expect(r.desglose).toContain("Flete");
    expect(r.desglose).toContain("Traslado");
    expect(r.desglose).toContain("Tarifa de servicio");
    expect(r.desglose).toContain("IVA 16%");
    expect(r.desglose).toContain("TOTAL");
  });

  it("Desglose sin factura no incluye línea de IVA", () => {
    const r = calcularEnvio({
      productos: makeProducts({ kg: 25 }),
      cp: "06000",
      subtotal: 1000,
      requiereFactura: false,
    });
    expect(r.desglose).not.toContain("IVA");
  });
});

// ── Caso real: cotización típica ───────────────────────────────────

describe("shipping/calculator — escenario realista", () => {
  it("Cliente de Naucalpan pide 50 kg de Sportok con factura", () => {
    // 50 kg × $75/kg mayoreo = $3,750 subtotal
    const r = calcularEnvio({
      productos: [{ nombre: "sportok", kg: 50 }],
      cp: "53000",
      subtotal: 3750,
      requiereFactura: true,
    });

    // 50 kg → 2 rollos (ceil(50/25))
    expect(r.totalRollos).toBe(2);
    // 2 rollos → flete 250 (en escalón ≤4)
    expect(r.flete).toBe(250);
    // 25 km × 2 = 50 km. 10 L. 10 × 27 × 4 × 1 = 1080
    expect(r.traslado).toBeCloseTo(1080, 1);
    // Tarifa servicio fija = 175
    expect(r.tarifaServicio).toBe(175);
    // Base = 3750 + 250 + 1080 + 175 = 5255
    expect(r.base).toBeCloseTo(5255, 1);
    // IVA = 5255 × 0.16 = 840.8
    expect(r.iva).toBeCloseTo(840.8, 1);
    // Total = 5255 × 1.16 = 6095.8
    expect(r.total).toBeCloseTo(6095.8, 1);
  });
});