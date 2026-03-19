// src/lib/hilos.ts
import { Product } from "./products";

export const hilos: Product[] = [
  {
    id: "hilo-kingtex-40-2",
    title: "Hilo Kingtex 40/2 (5,000m)",
    category: "Hilos",
    unit: "Pieza",
    thumbnail: "/assets/products/hilos/hilos.png",
    description: "Hilo Kingtex 100% poliéster fibra corta. Calidad premium para costura industrial de alta velocidad. Lubricación especial para evitar rupturas.",
    composicion: "100% Poliéster Fibra Corta",
    gramaje: "40/2",
    ancho: "N/A",
    rendimiento: 5000,
    unidadesPorRollo: 120, // Cantidad por CAJA
    prices: {
      menudeo: 29.00, // Precio por pieza
      mayoreo: 25.00  // Precio especial por caja (120 pzs)
    },
    hasRollo: true,
    colors: [
      // --- NEUTROS Y CLAROS ---
      { name: "Blanco Óptico (D107)", hex: "#FFFFFF" },
      { name: "Negro Industrial (D089)", hex: "#000000" },
      { name: "Crudo / Natural (D001)", hex: "#FDF5E6" },
      { name: "Hueso (D142)", hex: "#F5F5DC" },
      { name: "Perla (D111)", hex: "#EAE0C8" },
      { name: "Marfil (D002)", hex: "#FFFFF0" },

      // --- GRISES (Línea Iberia / Oxford) ---
      { name: "Gris Iberia (D010)", hex: "#D3D3D3" },
      { name: "Gris Plata (D011)", hex: "#C0C0C0" },
      { name: "Gris Medio (D012)", hex: "#808080" },
      { name: "Gris Rata (D013)", hex: "#666666" },
      { name: "Gris Oxford (D014)", hex: "#373737" },
      { name: "Charcoal (D158)", hex: "#2F4F4F" },

      // --- AZULES (Línea Escolar y Sport) ---
      { name: "Azul Cielo (D020)", hex: "#87CEEB" },
      { name: "Azul Turquesa (D022)", hex: "#00CED1" },
      { name: "Azul Francia (D124)", hex: "#318CE7" },
      { name: "Azul Rey (D025)", hex: "#1434A4" },
      { name: "Azul Eléctrico (D128)", hex: "#0000FF" },
      { name: "Azul Mezclilla (D027)", hex: "#4A658F" },
      { name: "Azul Marino Claro (D028)", hex: "#000080" },
      { name: "Azul Marino Obscuro (D029)", hex: "#000033" },

      // --- ROJOS Y VINOS ---
      { name: "Rojo Vivo (D040)", hex: "#FF0000" },
      { name: "Rojo Bandera (D041)", hex: "#C40233" },
      { name: "Rojo Sangre (D145)", hex: "#8B0000" },
      { name: "Vino / Guinda (D043)", hex: "#5C1527" },
      { name: "Chedron (D045)", hex: "#A0522D" },
      { name: "Ladrillo (D148)", hex: "#B22222" },

      // --- ROSAS Y FIUSHAS ---
      { name: "Rosa Pastel (D030)", hex: "#FFD1DC" },
      { name: "Rosa Baby (D031)", hex: "#F4C2C2" },
      { name: "Palo de Rosa (D033)", hex: "#D69A9A" },
      { name: "Fiusha (D035)", hex: "#FF00CB" },
      { name: "Bugambilia (D135)", hex: "#E0115F" },
      { name: "Magenta (D036)", hex: "#FF00FF" },

      // --- AMARILLOS Y NARANJAS ---
      { name: "Amarillo Canario (D050)", hex: "#FFE700" },
      { name: "Amarillo Oro (D052)", hex: "#FFD700" },
      { name: "Mango (D152)", hex: "#FFD21C" },
      { name: "Mostaza (D054)", hex: "#FFC300" },
      { name: "Naranja (D055)", hex: "#FF6F00" },
      { name: "Calabaza (D056)", hex: "#FF7518" },

      // --- VERDES ---
      { name: "Verde Limón (D060)", hex: "#32CD32" },
      { name: "Verde Manzana (D061)", hex: "#8DB600" },
      { name: "Verde Jade (D063)", hex: "#00A86B" },
      { name: "Verde Bandera (D065)", hex: "#006847" },
      { name: "Verde Botella (D067)", hex: "#004B23" },
      { name: "Verde Militar (D069)", hex: "#4B5320" },

      // --- CAFÉS Y BEIGES ---
      { name: "Beige Claro (D005)", hex: "#F5F5DC" },
      { name: "Arena (D007)", hex: "#C2B280" },
      { name: "Kaki (D008)", hex: "#C3B091" },
      { name: "Camel (D070)", hex: "#C19A6B" },
      { name: "Café Tabaco (D072)", hex: "#4B3621" },
      { name: "Chocolate (D075)", hex: "#3D2B1F" },

      // --- MORADOS Y LILAS ---
      { name: "Lila (D080)", hex: "#C8A2C8" },
      { name: "Morado (D082)", hex: "#800080" },
      { name: "Obispo (D084)", hex: "#4B0082" },
      { name: "Uva (D085)", hex: "#6F2DA8" },

      // --- NEONES (High-Vis) ---
      { name: "Verde Neón (D160)", hex: "#39FF14" },
      { name: "Amarillo Neón (D161)", hex: "#CCFF00" },
      { name: "Naranja Neón (D162)", hex: "#FF5F1F" },
      { name: "Rosa Neón (D163)", hex: "#FF6EC7" }
    ]
  }
];