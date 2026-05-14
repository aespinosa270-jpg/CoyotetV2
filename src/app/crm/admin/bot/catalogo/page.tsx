/**
 * Editor del catálogo del bot.
 *
 * Tabla con los productos del catálogo (source-of-truth desde lib/products.ts)
 * con los precios actuales (overlay aplicado de Redis).
 *
 * Click en una celda de precio → editor inline. Toggle "hidden" → POST a /api/admin/bot/catalog-override.
 */
import { getCatalog } from "@/lib/bot/repositories/catalog-repo";
import { ProductRowEditor } from "../_components/ProductRowEditor";
import { AsyncButton } from "../_components/AsyncButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogoPage() {
  const catalog = await getCatalog();

  return (
    <div className="space-y-4">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Editor de catálogo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {catalog.length} productos. Cambios en precio se aplican como overlay
            sobre <code>lib/products.ts</code> sin redeploy.
          </p>
        </div>
        <AsyncButton
          endpoint="/api/admin/bot/reindex"
          label="Reindexar pgvector"
          labelLoading="Reindexando..."
          confirmMessage="Esto regenera los embeddings de TODOS los productos. ¿Continuar?"
          variant="secondary"
        />
      </header>

      <div className="text-xs text-slate-500 bg-blue-50 border border-blue-200 rounded p-3">
        <strong>Tip:</strong> los precios se cambian en Redis (overlay). Tags y
        descripciones siguen viniendo del archivo. Si agregaste productos
        completamente nuevos a <code>lib/products.ts</code>, dale a "Reindexar"
        para que pgvector los conozca.
      </div>

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Producto
              </th>
              <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Categoría
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Menudeo
              </th>
              <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Mayoreo
              </th>
              <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wide px-3 py-2">
                Visible
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {catalog.map((p) => (
              <ProductRowEditor
                key={p.id}
                productId={p.id}
                nombre={p.nombre}
                categoria={p.categoria}
                precioMenudeo={p.menudeo}
                precioMayoreo={p.mayoreo}
                hidden={false /* getCatalog ya filtra los hidden, asumimos visible */}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
