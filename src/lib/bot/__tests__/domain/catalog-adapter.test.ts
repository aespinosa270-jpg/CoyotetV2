import { describe, it, expect } from "vitest";
import {
  adaptarProducto,
  slugify,
  groupByCategoria,
} from "../../domain/catalog/source-adapter";
import type { Product } from "@/lib/products";

// ── Helpers de prueba ──────────────────────────────────────────────

function fakeTela(overrides: Partial<Product> = {}): Product {
  return {
    id: "prod_alaska",
    title: "Alaska",
    unit: "Kilo",
    thumbnail: "/assets/products/alaska/blanco.jpg",
    description: "Tela deportiva especializada para sublimación.",
    composicion: "100% Poliéster",
    gramaje: "140",
    ancho: "1.60m",
    rendimiento: 4.0,
    singleColor: true,
    prices: { menudeo: 175.0, mayoreo: 170.0 },
    hasRollo: true,
    origin: "Importado",
    category: "Deportivas / Sublimación",
    ...overrides,
  };
}

function fakeMicropique(): Product {
  return fakeTela({
    id: "prod_micropique",
    title: "Micro piqué",
    rendimiento: 4.3,
    gramaje: "145",
    prices: { menudeo: 100, mayoreo: 95 },
    singleColor: undefined,
    colors: [
      { name: "Blanco", hex: "#FFFFFF", image: "/assets/blanco.jpg" },
      { name: "Negro", hex: "#050505", image: "/assets/negro.jpg" },
      { name: "Azul Rey", hex: "#1434A4", image: "/assets/rey.jpg" },
    ],
  });
}

// ── slugify ────────────────────────────────────────────────────────

describe("slugify", () => {
  it("convierte a minúsculas y reemplaza espacios", () => {
    expect(slugify("Alaska")).toBe("alaska");
    expect(slugify("Micro Panal")).toBe("micro-panal");
  });

  it("quita acentos", () => {
    expect(slugify("Micro piqué")).toBe("micro-pique");
    expect(slugify("Piqué Vera")).toBe("pique-vera");
  });

  it("elimina caracteres especiales", () => {
    expect(slugify("Hilo Kingtex 40/2 (5,000m)")).toBe(
      "hilo-kingtex-40-2-5-000m"
    );
  });

  it('Elástico Beisbolero 2½" → elastico-beisbolero-2', () => {
    expect(slugify('Elástico Beisbolero 2½"')).toBe("elastico-beisbolero-2");
  });
});

// ── Telas por kilo ─────────────────────────────────────────────────

describe("adaptarProducto — telas por kilo", () => {
  it("adapta una tela básica de color único", () => {
    const adapted = adaptarProducto(fakeTela());
    expect(adapted).not.toBeNull();
    expect(adapted?.categoria).toBe("telas");
    expect(adapted?.id).toBe("prod_alaska");
    expect(adapted?.slug).toBe("alaska");
    expect(adapted?.menudeo).toBe(175);
    expect(adapted?.mayoreo).toBe(170);
    if (adapted?.categoria === "telas") {
      expect(adapted.rendimientoMxKg).toBe(4.0);
      expect(adapted.gramaje).toBe(140);
      expect(adapted.ancho).toBeCloseTo(1.6, 2);
      expect(adapted.kgPorRollo).toBe(25); // default
      expect(adapted.colorUnico).toBe(true);
      expect(adapted.colores).toEqual([]);
    }
  });

  it("adapta una tela con paleta de colores rica", () => {
    const adapted = adaptarProducto(fakeMicropique());
    expect(adapted?.categoria).toBe("telas");
    if (adapted?.categoria === "telas") {
      expect(adapted.colorUnico).toBe(false);
      expect(adapted.colores).toHaveLength(3);
      expect(adapted.colores[0]).toEqual({
        nombre: "Blanco",
        hex: "#FFFFFF",
        imagen: "/assets/blanco.jpg",
      });
      expect(adapted.colores[2].nombre).toBe("Azul Rey");
      expect(adapted.colores[2].hex).toBe("#1434A4");
    }
  });

  it('"Kg" se trata igual que "Kilo" (Felpa Spun)', () => {
    const adapted = adaptarProducto(
      fakeTela({ id: "prod_felpa_spun", title: "Felpa Spun", unit: "Kg" })
    );
    expect(adapted?.categoria).toBe("telas");
  });

  it("respeta kgPorRollo custom (Flanel = 27 kg)", () => {
    const adapted = adaptarProducto(
      fakeTela({
        id: "prod_flanel",
        title: "Flanel",
        unidadesPorRollo: 27,
        category: "Línea Invernal",
      })
    );
    if (adapted?.categoria === "telas") {
      expect(adapted.kgPorRollo).toBe(27);
    }
  });
});

// ── Telas por metro ────────────────────────────────────────────────

describe("adaptarProducto — telas por metro", () => {
  it("adapta Diablo (50 m por rollo)", () => {
    const adapted = adaptarProducto(
      fakeTela({
        id: "prod_diablo",
        title: "Diablo",
        unit: "Metro",
        unidadesPorRollo: 50,
        category: "Telas Técnicas",
        gramaje: "220",
        ancho: "1.50m",
        rendimiento: 1,
        prices: { menudeo: 88, mayoreo: 83 },
        singleColor: false,
        colors: [{ name: "Negro", hex: "#050505" }],
      })
    );
    expect(adapted?.categoria).toBe("telasMetro");
    if (adapted?.categoria === "telasMetro") {
      expect(adapted.metrosPorRollo).toBe(50);
      expect(adapted.gramaje).toBe(220);
      expect(adapted.ancho).toBeCloseTo(1.5, 2);
      expect(adapted.colorUnico).toBe(false);
    }
  });

  it("adapta Lycra Metálica (98 m por rollo)", () => {
    const adapted = adaptarProducto(
      fakeTela({
        id: "lycra_metalica",
        title: "Lycra Metálica",
        unit: "Metro",
        unidadesPorRollo: 98,
        category: "Deportivo / Licra",
        prices: { menudeo: 50, mayoreo: 45 },
        colors: [{ name: "Oro", hex: "#D4AF37" }],
      })
    );
    expect(adapted?.categoria).toBe("telasMetro");
    if (adapted?.categoria === "telasMetro") {
      expect(adapted.metrosPorRollo).toBe(98);
    }
  });
});

// ── Hilos ──────────────────────────────────────────────────────────

describe("adaptarProducto — hilos", () => {
  it("adapta el hilo Kingtex (caja de 120 piezas)", () => {
    const adapted = adaptarProducto({
      id: "hilo-kingtex-40-2",
      title: "Hilo Kingtex 40/2 (5,000m)",
      category: "Hilos",
      unit: "Pieza",
      thumbnail: "/assets/hilos.png",
      description: "Hilo industrial premium",
      composicion: "100% Poliéster",
      gramaje: "40/2",
      ancho: "N/A",
      rendimiento: 5000,
      unidadesPorRollo: 120,
      prices: { menudeo: 29, mayoreo: 25 },
      hasRollo: true,
      colors: [{ name: "Blanco Óptico", hex: "#FFFFFF" }],
    });
    expect(adapted?.categoria).toBe("hilos");
    if (adapted?.categoria === "hilos") {
      expect(adapted.piezasPorCaja).toBe(120);
      expect(adapted.metrosPorCono).toBe(5000);
      expect(adapted.colores).toHaveLength(1);
    }
  });
});

// ── Elásticos ──────────────────────────────────────────────────────

describe("adaptarProducto — elásticos", () => {
  it("elástico beisbolero por metro", () => {
    const adapted = adaptarProducto({
      id: "elastico-beisbolero",
      title: 'Elástico Beisbolero 2½"',
      category: "Elásticos",
      unit: "Metro",
      thumbnail: "/assets/blanco.jpg",
      description: "Elástico beisbolero",
      composicion: "Poliéster / Caucho",
      gramaje: '2½"',
      ancho: "6.5 cm",
      rendimiento: 1,
      unidadesPorRollo: 50,
      prices: { menudeo: 19, mayoreo: 19 },
      hasRollo: false,
      origin: "MX",
      colors: [{ name: "Blanco", hex: "#FFFFFF" }],
    });
    expect(adapted?.categoria).toBe("elasticos");
    if (adapted?.categoria === "elasticos") {
      expect(adapted.unidad).toBe("metro");
      expect(adapted.metrosPorRollo).toBe(50);
    }
  });

  it("elástico de ligas se vende por pieza de 50 cm", () => {
    const adapted = adaptarProducto({
      id: "elastico-3-ligas",
      title: "Elástico 3 Ligas (50cm)",
      category: "Elásticos",
      unit: "Pieza",
      thumbnail: "/assets/blanco.jpg",
      description: "3 ligas",
      composicion: "Poliéster / Caucho",
      gramaje: "3 Ligas",
      ancho: "50 cm",
      rendimiento: 1,
      unidadesPorRollo: 1,
      prices: { menudeo: 80, mayoreo: 80 },
      hasRollo: false,
      origin: "MX",
      colors: [{ name: "Blanco", hex: "#FFFFFF" }],
    });
    expect(adapted?.categoria).toBe("elasticos");
    if (adapted?.categoria === "elasticos") {
      expect(adapted.unidad).toBe("pieza (50cm)");
      expect(adapted.metrosPorRollo).toBeUndefined();
    }
  });

  it("elástico con jareta se vende por cono", () => {
    const adapted = adaptarProducto({
      id: "elastico-jareta-3cm",
      title: "Elástico con Jareta 3 cm (Cono)",
      category: "Elásticos",
      unit: "Pieza",
      thumbnail: "/assets/blanco.jpg",
      description: "Jareta",
      composicion: "Poliéster / Caucho",
      gramaje: "3 cm",
      ancho: "3 cm",
      rendimiento: 1,
      unidadesPorRollo: 1,
      prices: { menudeo: 140, mayoreo: 140 },
      hasRollo: false,
      origin: "MX",
      colors: [{ name: "Blanco", hex: "#FFFFFF" }],
    });
    if (adapted?.categoria === "elasticos") {
      expect(adapted.unidad).toBe("cono");
    }
  });
});

// ── Robustez ───────────────────────────────────────────────────────

describe("adaptarProducto — robustez", () => {
  it("devuelve null si la unidad es desconocida", () => {
    const adapted = adaptarProducto(
      fakeTela({ unit: "Galón" } as unknown as Partial<Product>)
    );
    expect(adapted).toBeNull();
  });

  it("gramaje no numérico se omite (no rompe)", () => {
    const adapted = adaptarProducto(fakeTela({ gramaje: "N/A" }));
    if (adapted?.categoria === "telas") {
      expect(adapted.gramaje).toBeUndefined();
    }
  });

  it("ancho en cm se convierte a metros", () => {
    const adapted = adaptarProducto(fakeTela({ ancho: "65 cm" }));
    if (adapted?.categoria === "telas") {
      expect(adapted.ancho).toBeCloseTo(0.65, 2);
    }
  });

  it("preserva el id original (clave estable)", () => {
    const adapted = adaptarProducto(fakeTela());
    expect(adapted?.id).toBe("prod_alaska");
  });

  it("genera slug normalizado distinto al id", () => {
    const adapted = adaptarProducto(
      fakeTela({ id: "prod_micropique", title: "Micro piqué" })
    );
    expect(adapted?.slug).toBe("micro-pique");
    expect(adapted?.slug).not.toBe(adapted?.id);
  });
});

// ── groupByCategoria ───────────────────────────────────────────────

describe("groupByCategoria", () => {
  it("separa correctamente por discriminador", () => {
    const productos = [
      adaptarProducto(fakeTela())!,
      adaptarProducto(fakeMicropique())!,
      adaptarProducto({
        id: "h1",
        title: "Hilo Test",
        category: "Hilos",
        unit: "Pieza",
        thumbnail: "",
        description: "",
        composicion: "",
        gramaje: "",
        ancho: "",
        rendimiento: 5000,
        prices: { menudeo: 29, mayoreo: 25 },
        hasRollo: true,
      })!,
    ];
    const grouped = groupByCategoria(productos);
    expect(grouped.telas).toHaveLength(2);
    expect(grouped.hilos).toHaveLength(1);
    expect(grouped.telasMetro).toHaveLength(0);
    expect(grouped.elasticos).toHaveLength(0);
  });
});