"use server"

import { UnitType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function createProductAction(formData: FormData) {
  try {
    // 1. Extraemos los datos del formulario web
    const sku = formData.get('sku') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const unit = formData.get('unit') as UnitType;
    const priceMenudeo = parseFloat(formData.get('priceMenudeo') as string);
    const priceMayoreo = parseFloat(formData.get('priceMayoreo') as string);
    const composicion = formData.get('composicion') as string;
    const gramaje = formData.get('gramaje') as string;
    const ancho = formData.get('ancho') as string;

    // 2. Validamos que el SKU no exista ya
    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return { success: false, error: "El SKU ya existe en el sistema." };
    }

    // 3. Inyectamos la tela real a Supabase
    const newProduct = await prisma.product.create({
      data: {
        sku,
        title,
        category,
        unit,
        priceMenudeo,
        priceMayoreo,
        composicion,
        gramaje,
        ancho,
        hasRollo: true,
        isActive: true,
      }
    });

    // 4. Limpiamos el caché para que la tabla se actualice al instante
    revalidatePath('/crm/admin/bodega');
    
    return { success: true, productId: newProduct.id };
  } catch (error) {
    console.error("Error al crear producto:", error);
    return { success: false, error: "Fallo crítico al guardar en base de datos." };
  }
}
// Traer todos los productos para el Dashboard
export async function getProducts() {
  try {
    return await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10 // Traemos las 10 más recientes para no saturar el dashboard
    });
  } catch (error) {
    console.error("Error cargando bodega:", error);
    return [];
  }
}