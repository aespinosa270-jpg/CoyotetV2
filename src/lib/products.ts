// src/lib/products.ts

export interface Product {
  id: string;
  title: string;
  unit: string;
  thumbnail: string;
  description: string;
  composicion: string;
  gramaje: string;
  ancho: string;
  rendimiento: number;
  prices: {
    menudeo: number;
    mayoreo: number;
  };
  hasRollo: boolean;
  singleColor?: boolean;
  origin?: string;
  category: string; // 👈 ¡NUEVO CAMPO OBLIGATORIO!
}

export const products: Product[] = [
  {
    id: "prod_micropique_gold",
    title: "Micropiqué Gold",
    unit: "Kilo",
    thumbnail: "/assets/products/112.jpg", 
    description: "Tecnología Dry-Fit Calidad Gold. Ideal para uniformes deportivos de alto rendimiento.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.3,
    prices: { menudeo: 100.00, mayoreo: 85.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Línea Gold" // 👈 Categoría asignada
  },
  {
    id: "prod_pique_vera",
    title: "Piqué Vera Gold",
    unit: "Kilo",
    thumbnail: "/assets/products/113.jpg", 
    description: "Tecnología Dry-Fit con textura suave y resistente.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.3,
    prices: { menudeo: 110.00, mayoreo: 95.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Línea Gold"
  },
  {
    id: "prod_micro_panal",
    title: "Micro Panal Gold",
    unit: "Kilo",
    thumbnail: "/assets/products/114.jpg", 
    description: "Estructura de panal para máxima transpiración y ligereza.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.3,
    prices: { menudeo: 110.00, mayoreo: 95.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Línea Gold"
  },
  {
    id: "prod_torneo",
    title: "Torneo Gold",
    unit: "Kilo",
    thumbnail: "/assets/products/115.jpg", 
    description: "El estándar en durabilidad para torneos exigentes.",
    composicion: "100% Poliéster",
    gramaje: "150",
    ancho: "1.60m",
    rendimiento: 4.3,
    prices: { menudeo: 125.00, mayoreo: 110.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Línea Gold"
  },
  {
    id: "prod_kyoto",
    title: "Kyoto",
    unit: "Kilo",
    thumbnail: "/assets/products/116.jpg", 
    description: "Acabado premium con tacto seda y caída espectacular.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.0,
    singleColor: true,
    prices: { menudeo: 155.00, mayoreo: 140.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  },
  {
    id: "prod_panal_nitro",
    title: "Panal Nitro",
    unit: "Kilo",
    thumbnail: "/assets/products/117.jpg", 
    description: "Tejido técnico avanzado para control de humedad extremo.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.2,
    singleColor: true,
    prices: { menudeo: 185.00, mayoreo: 170.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  },
  {
    id: "prod_panal_plus",
    title: "Panal Plus",
    unit: "Kilo",
    thumbnail: "/assets/products/118.jpg", 
    description: "Mayor cuerpo y estructura para prendas que requieren forma.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 3.7,
    singleColor: true,
    prices: { menudeo: 155.00, mayoreo: 140.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  },
  {
    id: "prod_apolo",
    title: "Apolo",
    unit: "Kilo",
    thumbnail: "/assets/products/119.jpg", 
    description: "Resistencia superior a la abrasión y el pilling.",
    composicion: "100% Poliéster",
    gramaje: "150",
    ancho: "1.60m",
    rendimiento: 3.7,
    singleColor: true,
    prices: { menudeo: 160.00, mayoreo: 145.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  },
  {
    id: "prod_horous",
    title: "Horous",
    unit: "Kilo",
    thumbnail: "/assets/products/120.jpg", 
    description: "Diseño vanguardista para moda deportiva urbana.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.2,
    singleColor: true,
    prices: { menudeo: 160.00, mayoreo: 155.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  },
  {
    id: "prod_athlos",
    title: "Athlos",
    unit: "Kilo",
    thumbnail: "/assets/products/116.jpg", 
    description: "Versatilidad total para cualquier disciplina deportiva.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.0,
    singleColor: true,
    prices: { menudeo: 125.00, mayoreo: 120.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Telas Técnicas"
  }
];