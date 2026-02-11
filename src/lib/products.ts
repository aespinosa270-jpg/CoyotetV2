// src/lib/products.ts

// 1. MODIFICAMOS LA INTERFAZ PARA ACEPTAR IMÁGENES POR COLOR
export interface ProductColor {
  name: string;
  hex: string;
  image?: string; // 👈 Campo nuevo: Ruta de la foto específica del color
}

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
  category: string;
  colors?: ProductColor[];
}

export const products: Product[] = [
  {
    id: "prod_micropique_gold",
    title: "Micropiqué Gold",
    unit: "Kilo",
    thumbnail: "/assets/products/112.jpg", // Foto por defecto
    description: "Tecnología Dry-Fit Calidad Gold. Ideal para uniformes deportivos de alto rendimiento.",
    composicion: "100% Poliéster",
    gramaje: "145",
    ancho: "1.60m",
    rendimiento: 4.3,
    prices: { menudeo: 100.00, mayoreo: 85.00 },
    hasRollo: true,
    origin: "Importado",
    category: "Línea Gold",
    // 👇 AQUÍ ESTÁN LAS 35 VARIANTES CON SU RUTA DE IMAGEN
    colors: [
        { name: "Negro", hex: "#000000", image: "/assets/products/micropique/negro.jpg" },
        { name: "Blanco", hex: "#FFFFFF", image: "/assets/products/112.jpg"},
        { name: "Marino", hex: "#001B44", image: "/assets/products/micropique/marino.jpg" },
        { name: "Azul Petróleo", "hex": "#2F6A74", "image": "/assets/products/micropique/azul-petroleo.jpg" },
        { name: "Azul Rey", hex: "#0047AB", image: "/assets/products/micropique/azul-rey.jpg" },
        { name: "Rojo", hex: "#E3001B", image: "/assets/products/micropique/rojo1.jpg" },
        { name: "Gris Oxford", hex: "#3C3C3C", image: "/assets/products/micropique/gris-oxford.jpg" },
        { name: "Gris Jaspe", hex: "#A5A5A5", image: "/assets/products/micropique/gris-jaspe.jpg" },
        { name: "Azul Francia", hex: "#318CE7", image: "/assets/products/micropique/azul-francia.jpg" },
        { name: "Turquesa", hex: "#00CED1", image: "/assets/products/micropique/turquesa.jpg" },
        { name: "Verde Neón", hex: "#39FF14", image: "/assets/products/micropique/verde-neon.jpg" },
        { name: "Amarillo Neón", hex: "#CCFF00", image: "/assets/products/micropique/amarillo-neon.jpg" },
        { name: "Naranja Neón", hex: "#FF5F1F", image: "/assets/products/micropique/naranja-neon.jpg" },
        { name: "Rosa Neón", hex: "#FF1493", image: "/assets/products/micropique/rosa-neon.jpg" },
        { name: "Rosa Mexicano", hex: "#D40078", image: "/assets/products/micropique/rosa-mexicano.jpg" },
        { name: "Fucsia", hex: "#FF00FF", image: "/assets/products/micropique/fucsia.jpg" },
        { name: "Uva", hex: "#4B0082", image: "/assets/products/micropique/uva.jpg" },
        { name: "Magenta", hex: "#800080", image: "/assets/products/micropique/morado.jpg" },
        { name: "Vino", hex: "#5E1914", image: "/assets/products/micropique/vino.jpg" },
        { name: "Verde Bandera", hex: "#006847", image: "/assets/products/micropique/verde-bandera.jpg" },
        { name: "Verde Botella", hex: "#004225", image: "/assets/products/micropique/verde-botella.jpg" },
        { name: "Verde Limón", hex: "#32CD32", image: "/assets/products/micropique/verde-limon.jpg" },
        { name: "Esmeralda", hex: "#009B77", image: "/assets/products/micropique/esmeralda.jpg" },
        { name: "Azul Cielo", hex: "#87CEEB", image: "/assets/products/micropique/azul-cielo.jpg" },
        { name: "Aqua", hex: "#00FFFF", image: "/assets/products/micropique/aqua.jpg" },
        { name: "Amarillo Canario", hex: "#FFEF00", image: "/assets/products/micropique/amarillo-canario.jpg" },
        { name: "Oro", hex: "#FFD700", image: "/assets/products/micropique/oro.jpg" },
        { name: "Mango", hex: "#FF8200", image: "/assets/products/micropique/mango.jpg" },
        { name: "Coral", hex: "#FF7F50", image: "/assets/products/micropique/coral.jpg" },
        { name: "Ladrillo", hex: "#B22222", image: "/assets/products/micropique/ladrillo.jpg" },
        { name: "Beige", hex: "#F5F5DC", image: "/assets/products/micropique/beige.jpg" },
        { name: "Arena", hex: "#D2B48C", image: "/assets/products/micropique/arena.jpg" },
        { name: "Miel", hex: "#C68E17", image: "/assets/products/micropique/miel.jpg" },
        { name: "Lila", hex: "#C8A2C8", image: "/assets/products/micropique/lila.jpg" },
        { name: "Hueso", hex: "#F9F6EE", image: "/assets/products/micropique/hueso.jpg" },
        { name: "Plumbago", hex: "#5C9BD1", image: "/assets/products/micropique/plumbago.jpg" }
    ]
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
  },
  {
    id: "prod_brock",
    title: "Brock",
    unit: "Kilo",
    thumbnail: "/assets/products/brock.jpg",
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
  },
  {
    id: "prod_pique-vera-sport",
    title: "Pique Vera Sport",
    unit: "Kilo",
    thumbnail: "/assets/products/sport.jpeg",
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