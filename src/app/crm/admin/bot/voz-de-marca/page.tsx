import { Suspense } from "react";
import VozDeMarcaClient from "./_components/VozDeMarcaClient";

export const dynamic = "force-dynamic";

export default function VozDeMarcaPage() {
  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">🎭</span>
          <h1 className="text-2xl font-bold text-neutral-900">
            Voz de Marca
          </h1>
        </div>
        <p className="text-sm text-neutral-600 max-w-3xl">
          Define cómo habla Coyote. Cambios aplican al bot en menos de 60 segundos
          sin re-deploy. Lo usan: bot V2 (WhatsApp), Sales Agent IA, Aftercare generate.
        </p>
      </header>
      <Suspense fallback={<div className="p-8 text-center text-neutral-500">Cargando…</div>}>
        <VozDeMarcaClient />
      </Suspense>
    </div>
  );
}