import ZadarmaWidget from "@/components/ui/ZadarmaWidget";

export default function CRMLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen bg-[#050505]">
      {/* Todo el contenido de tu CRM (Dashboard, Login, etc) */}
      {children}

      {/* ☎️ El Teléfono Virtual incrustado */}
      <ZadarmaWidget />
    </div>
  );
}