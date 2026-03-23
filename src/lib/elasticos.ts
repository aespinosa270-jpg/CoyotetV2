// src/lib/elasticos.ts
import { Product } from "./products";

export const elasticos: Product[] = [

  // --- ELÁSTICO BEISBOLERO (solo un ancho, un precio) ---
  {
    id: "elastico-beisbolero",
    title: "Elástico Beisbolero 2½\"",
    category: "Elásticos",
    unit: "Metro",
    thumbnail: "/assets/products/elasticos/beisbolero-2-1-2/blanco.jpg",
    description: "Elástico beisbolero de 2½ pulgadas (aprox. 6.5 cm). Ideal para cinturas, uniformes deportivos y aplicaciones de alta tensión.",
    composicion: "Poliéster / Caucho",
    gramaje: "2½\"",
    ancho: "6.5 cm",
    rendimiento: 1,
    unidadesPorRollo: 50,
    prices: { menudeo: 19.00, mayoreo: 19.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  // --- ELÁSTICOS POR LIGAS (blanco + negro fusionados) ---
  {
    id: "elastico-3-ligas",
    title: "Elástico 3 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-3-ligas/blanco.jpg",
    description: "Rollo de elástico de 3 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "3 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 80.00, mayoreo: 80.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-5-ligas",
    title: "Elástico 5 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-5-ligas/blanco.jpg",
    description: "Rollo de elástico de 5 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "5 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 100.00, mayoreo: 100.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-7-ligas",
    title: "Elástico 7 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-7-ligas/blanco2.jpg",
    description: "Rollo de elástico de 7 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "7 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 110.00, mayoreo: 110.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-10-ligas",
    title: "Elástico 10 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-10-ligas/blanco1.jpg",
    description: "Rollo de elástico de 10 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "10 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 100.00, mayoreo: 100.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-12-ligas",
    title: "Elástico 12 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-12-ligas/blanco1.jpg",
    description: "Rollo de elástico de 12 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "12 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 110.00, mayoreo: 110.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-16-ligas",
    title: "Elástico 16 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-16-ligas/blanco.jpg",
    description: "Rollo de elástico de 16 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "16 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 80.00, mayoreo: 80.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-20-ligas",
    title: "Elástico 20 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-20-ligas/blanco.jpg",
    description: "Rollo de elástico de 20 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "20 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 100.00, mayoreo: 100.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-25-ligas",
    title: "Elástico 25 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-25-ligas/blanco.jpg",
    description: "Rollo de elástico de 25 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "25 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 100.00, mayoreo: 100.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  {
    id: "elastico-30-ligas",
    title: "Elástico 30 Ligas (50cm)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/50cm-30-ligas/blanco.jpg",
    description: "Rollo de elástico de 30 ligas en presentación de 50 cm. Disponible en blanco y negro.",
    composicion: "Poliéster / Caucho",
    gramaje: "30 Ligas",
    ancho: "50 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 120.00, mayoreo: 120.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
      { name: "Negro", hex: "#111111" },
    ]
  },

  // --- ELÁSTICO CON JARETA (por cono) ---
  {
    id: "elastico-jareta-3cm",
    title: "Elástico con Jareta 3 cm (Cono)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/3cm-jareta/blanco.jpg",
    description: "Elástico con jareta de 3 cm en presentación de cono. Ideal para blusas, pantalones y prendas con resorte interno.",
    composicion: "Poliéster / Caucho",
    gramaje: "3 cm",
    ancho: "3 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 140.00, mayoreo: 140.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
    ]
  },

  {
    id: "elastico-jareta-4cm",
    title: "Elástico con Jareta 4 cm (Cono)",
    category: "Elásticos",
    unit: "Pieza",
    thumbnail: "/assets/products/elasticos/4cm-jareta/blanco.jpg",
    description: "Elástico con jareta de 4 cm en presentación de cono. Ideal para blusas, pantalones y prendas con resorte interno.",
    composicion: "Poliéster / Caucho",
    gramaje: "4 cm",
    ancho: "4 cm",
    rendimiento: 1,
    unidadesPorRollo: 1,
    prices: { menudeo: 145.00, mayoreo: 145.00 },
    hasRollo: false,
    origin: "MX",
    colors: [
      { name: "Blanco", hex: "#FFFFFF" },
    ]
  },

];