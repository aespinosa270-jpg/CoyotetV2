import CoyotePOS from "./CoyotePOS";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Coyote Core · POS",
};

export default async function PosPage() {
  const dbProducts = await prisma.product.findMany({
    where: { isActive: true }
  });

  // Mapeamos los campos de la BD al formato que entiende el POS
  const initialProducts = dbProducts.map(p => ({
    id: p.id,
    sku: p.sku,
    nombre: p.title,
    precio: p.priceMenudeo,
    precio_mayoreo: p.priceMayoreo,
    precio_rollo: p.priceMayoreo, // Usamos mayoreo como base para el rollo
    unidad: p.unit === "KILO" ? "kg" : p.unit === "METRO" ? "m" : "pza",
    stock_guatemala: 0, 
    minimo: 10,
    stock_plomo: 0
  }));

  return <CoyotePOS initialProducts={initialProducts} />;
}
