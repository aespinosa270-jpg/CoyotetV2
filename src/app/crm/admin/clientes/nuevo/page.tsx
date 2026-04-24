import NuevoClienteForm from "../_components/NuevoClienteForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function NuevoClientePage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/crm");

  return (
    <div className="p-6 md:p-8 w-full max-w-[1200px] mx-auto">
      <div className="mb-10">
        <p className="text-[10px] tracking-widest text-gray-500 uppercase font-bold mb-1">
          CRM / CLIENTES
        </p>
        <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tighter italic">
          ALTA DE <span className="text-[#FDCB02]">CLIENTE</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-2">
          Ingresa los datos del nuevo prospecto o cliente para habilitar su historial.
        </p>
      </div>

      <NuevoClienteForm />
    </div>
  );
}