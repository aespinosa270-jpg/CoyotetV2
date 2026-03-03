"use server"

import { UnitType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// 1. Obtener telas ACTIVAS
export async function getProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true }, // 🔥 SOLO TRAE LAS QUE NO ESTÁN BORRADAS
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error("Error cargando bodega:", error);
    return [];
  }
}

// 2. Crear
export async function createProductAction(formData: FormData) {
  try {
    const sku = formData.get('sku') as string;
    const title = formData.get('title') as string;
    const category = formData.get('category') as string;
    const unit = formData.get('unit') as UnitType;
    const priceMenudeo = parseFloat(formData.get('priceMenudeo') as string);
    const priceMayoreo = parseFloat(formData.get('priceMayoreo') as string);
    const composicion = formData.get('composicion') as string;
    const gramaje = formData.get('gramaje') as string;
    const ancho = formData.get('ancho') as string;

    const existingProduct = await prisma.product.findUnique({ where: { sku } });
    if (existingProduct) {
      return { success: false, error: "El SKU ya existe en el sistema." };
    }

    const newProduct = await prisma.product.create({
      data: {
        sku, title, category, unit, priceMenudeo, priceMayoreo,
        composicion, gramaje, ancho, hasRollo: true, isActive: true,
      }
    });

    revalidatePath('/crm/admin/productos');
    return { success: true, productId: newProduct.id };
  } catch (error) {
    return { success: false, error: "Fallo crítico al guardar en BD." };
  }
}

// 3. Traer uno solo (Para Editar)
export async function getProductById(id: string) {
  try {
    return await prisma.product.findUnique({
      where: { id },
      include: { colors: true }
    });
  } catch (error) {
    return null;
  }
}

// 4. Actualizar
export async function updateProductAction(id: string, formData: FormData) {
  try {
    const data = {
      sku: formData.get('sku') as string,
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      unit: formData.get('unit') as UnitType,
      priceMenudeo: parseFloat(formData.get('priceMenudeo') as string),
      priceMayoreo: parseFloat(formData.get('priceMayoreo') as string),
      composicion: formData.get('composicion') as string,
      gramaje: formData.get('gramaje') as string,
      ancho: formData.get('ancho') as string,
    };

    await prisma.product.update({ where: { id }, data });
    revalidatePath('/crm/admin/productos');
    revalidatePath(`/crm/admin/productos/${id}/editar`);
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo actualizar." };
  }
}

// 5. 🔥 NUEVO: ELIMINAR (Soft Delete / Archivar)
export async function deleteProductAction(id: string) {
  try {
    await prisma.product.update({
      where: { id },
      data: { isActive: false } // Lo ocultamos del catálogo
    });
    revalidatePath('/crm/admin/productos');
    return { success: true };
  } catch (error) {
    return { success: false, error: "No se pudo eliminar la tela." };
  }
}