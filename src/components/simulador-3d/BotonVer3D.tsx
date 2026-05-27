"use client";

/**
 * Boton "Ver en 3D" para integrar en pagina de producto.
 *
 * Uso:
 *   <BotonVer3D texturaUrl="/assets/products/alaska/blanco.jpg" nombreTela="Alaska" />
 */

import { useState } from "react";
import SimuladorModal from "./SimuladorModal";
import type { TipoPrenda } from "./SimuladorPrenda";

interface Props {
  texturaUrl: string;
  nombreTela: string;
  prendaInicial?: TipoPrenda;
  className?: string;
}

export default function BotonVer3D({
  texturaUrl,
  nombreTela,
  prendaInicial,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-lg font-semibold text-sm hover:from-amber-500 hover:to-amber-600 transition shadow-lg ${className}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
        Ver en 3D
      </button>

      <SimuladorModal
        open={open}
        onClose={() => setOpen(false)}
        texturaUrl={texturaUrl}
        nombreTela={nombreTela}
        prendaInicial={prendaInicial}
      />
    </>
  );
}