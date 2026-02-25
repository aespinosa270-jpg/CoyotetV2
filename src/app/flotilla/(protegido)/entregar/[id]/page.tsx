"use client";

// ✅ CONSERVA: GPS obligatorio (getCurrentPosition bloqueante), Supabase, WhatsApp (en API)
// ✅ CORREGIDO: Blindaje anti-crashes (fallback a arreglo vacío) en todos los métodos de orden.items
// ✅ NUEVO: Generador Dinámico de Tags con Texto 100% Libre (Nombre + Detalles)

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Package, Camera, PenLine, CheckCircle2,
  AlertTriangle, ChevronRight, Minus, Plus, X, RotateCcw,
  Loader2, MapPin, Clock, Hash, Navigation2, Phone, UploadCloud,
} from "lucide-react";

type Item = {
  id: string;
  tag: string;
  qtyDispatched: number;
  qtyDelivered: number | null;
  description: string | null;
};

type Orden = {
  id: string;
  type: string;       // RECOLECCION | RESTOCK_INTERNO | RESTOCK_PROVEEDOR
  status: string;     // PENDIENTE | ASIGNADA | EN_CAMINO | COMPLETADA | CANCELADA
  contactName: string;
  address: string;
  contactPhone: string | null;
  notes: string | null;
  scheduledAt: string | null;
  items: Item[];
};

const TIPO_LABEL: Record<string, string> = {
  RECOLECCION:       "Recolección",
  RESTOCK_INTERNO:   "Restock Bodega",
  RESTOCK_PROVEEDOR: "Restock Proveedor",
};

// ─── Canvas de Firma ──────────────────────────────────────────────────────────
function SignatureCanvas({
  label, required, onSave, saved,
}: {
  label: string; required?: boolean;
  onSave: (data: string) => void; saved: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    if ("touches" in e) return { x: (e.touches[0].clientX - rect.left) * sx, y: (e.touches[0].clientY - rect.top) * sy };
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    isDrawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#FDCB02"; ctx.lineWidth = 3;
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
  };

  const stopDraw = () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onSave("");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
          {label} {required && <span className="text-red-400">*</span>}
        </p>
        <button onClick={clear} className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-white transition-colors">
          <RotateCcw size={10} /> Limpiar
        </button>
      </div>
      {saved ? (
        <div className="relative rounded-2xl overflow-hidden border border-green-600/40 bg-green-950/20">
          <img src={saved} alt="Firma" className="w-full h-32 object-contain" />
          <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <CheckCircle2 size={14} className="text-white" />
          </div>
          <button onClick={clear} className="absolute top-2 left-2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
            <X size={12} className="text-white" />
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-black overflow-hidden touch-none">
          <canvas
            ref={canvasRef} width={600} height={180} className="w-full h-32 cursor-crosshair"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
            onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
          />
          <p className="text-center text-[9px] text-neutral-700 pb-2">Firma aquí con el dedo</p>
        </div>
      )}
    </div>
  );
}

// ─── Pantalla Principal ───────────────────────────────────────────────────────
export default function PantallaEntrega() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [orden, setOrden] = useState<Orden | null>(null);
  const [loadingOrden, setLoadingOrden] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados Originales de Tags
  const [tags, setTags] = useState<Record<string, number>>({});
  
  // 🔥 NUEVOS ESTADOS: Generador Dinámico (Texto Libre)
  const [extraItems, setExtraItems] = useState<Item[]>([]);
  const [nuevoItemNombre, setNuevoItemNombre] = useState("");
  const [nuevoItemDetalle, setNuevoItemDetalle] = useState("");

  const [fotos, setFotos] = useState<string[]>([]);
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const [sigOrigin, setSigOrigin] = useState("");
  const [sigDest, setSigDest] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [finalStatus, setFinalStatus] = useState<"COMPLETADA" | "CANCELADA">("COMPLETADA");

  useEffect(() => {
    fetch(`/api/flotilla/route-orders/${orderId}`)
      .then((r) => r.json())
      .then((data) => {
        setOrden(data);
        setTags(Object.fromEntries(
          (data.items ?? []).map((i: Item) => [i.id, i.qtyDispatched])
        ));
      })
      .catch(() => setError("No se pudo cargar la orden."))
      .finally(() => setLoadingOrden(false));
  }, [orderId]);

  if (loadingOrden) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <Loader2 size={32} className="text-[#FDCB02] animate-spin" />
    </div>
  );

  if (!orden) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-red-400 font-bold mb-4">Orden no encontrada</p>
        <Link href="/flotilla" className="text-[#FDCB02] text-sm">← Volver</Link>
      </div>
    </div>
  );

  // Consolidamos la carga (Original + Creada libremente en Ruta)
  const todosLosItems = [...(orden.items || []), ...extraItems];
  
  // El delta evalúa también si hay ítems extra
  const hasDelta = todosLosItems.some((i) => tags[i.id] !== i.qtyDispatched);
  const isComplete = ["COMPLETADA", "CANCELADA"].includes(orden.status);

  // Avanzar status EN_CAMINO al confirmar llegada (paso 2 → 3)
  const irAlStep = async (nuevoStep: number) => {
    if (nuevoStep === 3 && orden.status === "ASIGNADA") {
      await fetch(`/api/flotilla/route-orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EN_CAMINO" }),
      });
      setOrden((prev) => prev ? { ...prev, status: "EN_CAMINO" } : prev);
    }
    setStep(nuevoStep);
  };

  // 🔥 FUNCIÓN: Crear Carga Extra con Texto Libre
  const agregarTagExtra = () => {
    if (!nuevoItemNombre.trim()) return;
    const nuevoId = `EXTRA-${Date.now()}`;
    const nuevoItem: Item = {
      id: nuevoId,
      tag: nuevoItemNombre.toUpperCase(), // Lo pasamos a mayúsculas para estética
      qtyDispatched: 0, 
      qtyDelivered: 1, 
      description: nuevoItemDetalle.trim() || "Añadido manualmente en ruta"
    };
    
    setExtraItems([...extraItems, nuevoItem]);
    setTags((prev) => ({ ...prev, [nuevoId]: 1 }));
    setNuevoItemNombre("");
    setNuevoItemDetalle("");
  };

  // GPS obligatorio
  const confirmarEntrega = async () => {
    if (finalStatus === "COMPLETADA" && !sigDest) {
      setError("La firma del destinatario es obligatoria."); return;
    }
    if (hasDelta && !issueNote) {
      setError("Hay diferencia en mercancía o carga no registrada. Agrega nota."); return;
    }
    if (finalStatus === "CANCELADA" && !issueNote) {
      setError("Describe el motivo de la cancelación."); return;
    }

    setLoading(true); setError(null);

    if (!navigator.geolocation) {
      alert("🐺 Tu celular no soporta GPS. Es obligatorio para registrar la entrega.");
      setLoading(false); return;
    }

    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const lat = posicion.coords.latitude;
        const lng = posicion.coords.longitude;
        try {
          const res = await fetch("/api/flotilla/entregar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId,
              tags: (orden.items || []).map((i) => ({ itemId: i.id, qtyDelivered: tags[i.id] })),
              extraTags: extraItems.map((i) => ({ tag: i.tag, qtyDelivered: tags[i.id], description: i.description })),
              fotos,
              signatureOrigin: sigOrigin || null,
              signatureDestination: sigDest || null,
              issueNote: issueNote || null,
              finalStatus,
              lat, lng,
            }),
          });
          const data = await res.json();
          if (data.success) {
            router.push("/flotilla?success=true");
            router.refresh();
          } else {
            setError(data.error ?? "Error al confirmar en el servidor.");
            setLoading(false);
          }
        } catch {
          setError("Error de red. Intenta de nuevo.");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error GPS:", err);
        alert("❌ PERMISO DENEGADO: Necesitas activar tu Ubicación (GPS) para poder confirmar la entrega.");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => setFotos((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const hora = orden.scheduledAt
    ? new Date(orden.scheduledAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : "--:--";

  return (
    <div className="min-h-screen bg-[#080808] font-sans pb-10">

      {/* APP BAR */}
      <div className="sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-4 px-5 py-4">
          <Link href="/flotilla" className="text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-neutral-500">
              {TIPO_LABEL[orden.type] ?? orden.type}
            </p>
            <p className="text-sm font-black text-white truncate">{orden.contactName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">GPS</span>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="flex px-5 pb-3 gap-2">
          {["Detalles", "Tags", "Fotos", "Firmas"].map((label, idx) => (
            <div key={label} className="flex-1 space-y-1">
              <div className={`h-1 rounded-full transition-all duration-300 ${step >= idx + 1 ? "bg-[#FDCB02]" : "bg-white/10"}`} />
              <p className={`text-[8px] font-black uppercase tracking-widest text-center ${step >= idx + 1 ? "text-[#FDCB02]" : "text-neutral-700"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── STEP 1: DETALLES ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="px-5 pt-6 space-y-4">
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5 space-y-5">
            <div className="flex items-start gap-3">
              <MapPin size={16} className="text-[#FDCB02] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Dirección</p>
                <p className="text-white font-bold text-sm">{orden.address}</p>
              </div>
            </div>
            {orden.contactPhone && (
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-[#FDCB02] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Teléfono</p>
                  <a href={`tel:${orden.contactPhone}`} className="text-white font-bold text-sm underline">
                    {orden.contactPhone}
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-[#FDCB02] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Horario</p>
                <p className="text-white font-bold text-sm">{hora}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Package size={16} className="text-[#FDCB02] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Carga Registrada</p>
                <p className="text-white font-bold text-sm">
                  {(orden.items || []).length} items · {(orden.items || []).reduce((a, b) => a + b.qtyDispatched, 0)} uds
                </p>
              </div>
            </div>
            {orden.notes && (
              <div className="bg-[#FDCB02]/5 border border-[#FDCB02]/20 rounded-2xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB02]/60 mb-1">Notas</p>
                <p className="text-sm text-neutral-300">{orden.notes}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Tags en esta orden</p>
            {(orden.items || []).map((item) => (
              <div key={item.id} className="flex items-center gap-3 bg-white/3 border border-white/5 rounded-2xl px-4 py-3">
                <Hash size={12} className="text-neutral-600" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{item.tag}</p>
                  {item.description && <p className="text-[10px] text-neutral-500">{item.description}</p>}
                </div>
                <span className="text-xs font-black text-[#FDCB02]">{item.qtyDispatched} uds</span>
              </div>
            ))}
            {(orden.items || []).length === 0 && (
              <p className="text-xs text-neutral-500 italic px-2">Orden en blanco. Añade la carga recibida en el siguiente paso.</p>
            )}
          </div>

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(orden.address)}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 rounded-2xl py-4 text-sm font-bold text-white active:scale-95 transition-all"
          >
            <Navigation2 size={16} className="text-[#FDCB02]" /> Abrir en Google Maps
          </a>

          {!isComplete && (
            <button
              onClick={() => irAlStep(2)}
              className="w-full bg-[#FDCB02] text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              Confirmé mi llegada <ChevronRight size={18} />
            </button>
          )}
          {isComplete && (
            <div className="bg-green-950/30 border border-green-600/30 rounded-2xl p-4 text-center">
              <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
              <p className="text-green-400 font-black text-sm">Esta orden ya fue completada</p>
            </div>
          )}
        </div>
      )}

      {/* ─── STEP 2: TAGS Y TEXTO LIBRE ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="px-5 pt-6">
          <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Paso 2 · Conciliación de Mercancía</p>
          <p className="text-[10px] text-neutral-600 mb-5">Verifica lo registrado y añade cualquier bulto extra que te entreguen</p>

          <div className="space-y-3">
            {todosLosItems.map((item) => {
              const isExtra = item.id.startsWith("EXTRA-");
              const isDiff = tags[item.id] !== item.qtyDispatched;
              
              return (
                <div key={item.id} className={`border rounded-3xl p-5 ${isDiff ? "border-orange-500/40 bg-orange-950/20" : "border-white/8 bg-white/3"} relative overflow-hidden`}>
                  {isExtra && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#FDCB02]" />}
                  <div className="flex items-start justify-between mb-4 pl-2">
                    <div className="flex-1 pr-3">
                      <p className="text-xs font-black text-white break-words">{item.tag}</p>
                      {item.description && <p className="text-[10px] text-neutral-500 mt-0.5 break-words">{item.description}</p>}
                    </div>
                    {isDiff && !isExtra && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-orange-400 bg-orange-950 px-2 py-1 rounded-full whitespace-nowrap">
                        <AlertTriangle size={9} /> Delta
                      </span>
                    )}
                    {isExtra && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-black bg-[#FDCB02] px-2 py-1 rounded-full whitespace-nowrap">
                        <Plus size={9} /> Nuevo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pl-2">
                    <div className="text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-1">En Sistema</p>
                      <p className="text-2xl font-black text-neutral-400">{item.qtyDispatched}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setTags((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? 0) - 1) }))}
                        className="w-10 h-10 bg-white/10 border border-white/10 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                        <Minus size={16} className="text-white" />
                      </button>
                      <div className="text-center min-w-[3rem]">
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#FDCB02]/60 mb-1">Recibes</p>
                        <p className={`text-2xl font-black ${isDiff || isExtra ? "text-orange-400" : "text-[#FDCB02]"}`}>{tags[item.id] ?? 0}</p>
                      </div>
                      <button onClick={() => setTags((p) => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }))}
                        className="w-10 h-10 bg-[#FDCB02]/20 border border-[#FDCB02]/30 rounded-xl flex items-center justify-center active:scale-90 transition-all">
                        <Plus size={16} className="text-[#FDCB02]" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 🔥 GENERADOR DINÁMICO DE TEXTO LIBRE 🔥 */}
          <div className="mt-6 p-5 border border-[#FDCB02]/30 bg-[#FDCB02]/5 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FDCB02] mb-4">Añadir Mercancía Manualmente</p>
            <div className="flex flex-col gap-3">
              <input
                type="text" 
                placeholder="¿Qué estás recibiendo? (Ej. Bolsa con 10 cierres)" 
                value={nuevoItemNombre} 
                onChange={(e) => setNuevoItemNombre(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder-neutral-600 focus:outline-none focus:border-[#FDCB02]"
              />
              <div className="flex gap-2">
                <input
                  type="text" 
                  placeholder="Detalles (Opcional)" 
                  value={nuevoItemDetalle} 
                  onChange={(e) => setNuevoItemDetalle(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-[#FDCB02]"
                />
                <button 
                  onClick={agregarTagExtra} 
                  className="px-6 bg-[#FDCB02] text-black font-black rounded-xl text-xs uppercase tracking-widest active:scale-95 transition-all"
                >
                  Sumar
                </button>
              </div>
            </div>
          </div>

          {hasDelta && (
            <div className="mt-5 bg-orange-950/30 border border-orange-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-orange-400" />
                <p className="text-orange-400 font-black text-xs uppercase">Diferencia o Carga Extra</p>
              </div>
              <p className="text-[11px] text-orange-300/60">En el último paso el sistema te pedirá justificar este movimiento.</p>
            </div>
          )}

          <button onClick={() => irAlStep(3)}
            className="w-full mt-6 bg-[#FDCB02] text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-yellow-500/20">
            Carga confirmada <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ─── STEP 3: FOTOS ────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="px-5 pt-6">
          <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Paso 3 · Evidencia fotográfica</p>
          <p className="text-[10px] text-neutral-600 mb-5">Captura la fachada o a quien recibe la mercancía</p>

          <input ref={fotoInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFoto} />

          {fotos.length === 0 ? (
            <button onClick={() => fotoInputRef.current?.click()}
              className="w-full h-52 border-2 border-dashed border-white/15 rounded-3xl flex flex-col items-center justify-center gap-3 active:scale-95 transition-all hover:border-[#FDCB02]/30">
              <div className="w-16 h-16 bg-[#FDCB02]/10 border border-[#FDCB02]/20 rounded-2xl flex items-center justify-center">
                <Camera size={28} className="text-[#FDCB02]" />
              </div>
              <p className="text-sm font-bold text-neutral-400">Abrir cámara</p>
              <p className="text-[10px] text-neutral-600">Cámara trasera · JPG/PNG</p>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {fotos.map((f, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                    <img src={f} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <button onClick={() => setFotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => fotoInputRef.current?.click()}
                className="w-full bg-white/5 border border-white/8 rounded-2xl py-3 text-sm font-bold text-neutral-400 flex items-center justify-center gap-2">
                <Camera size={16} /> Agregar más fotos
              </button>
            </div>
          )}

          <button disabled={fotos.length === 0} onClick={() => setStep(4)}
            className="w-full mt-5 bg-[#FDCB02] text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
            Fotos listas <ChevronRight size={18} />
          </button>
          <button onClick={() => setStep(4)} className="w-full mt-2 py-3 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
            Omitir fotos (no recomendado)
          </button>
        </div>
      )}

      {/* ─── STEP 4: FIRMAS ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="px-5 pt-6 space-y-5">
          <div>
            <p className="text-xs font-black text-neutral-500 uppercase tracking-[0.2em] mb-1">Paso 4 · Doble firma digital</p>
            <p className="text-[10px] text-neutral-600 mb-5">Firma del destinatario obligatoria para completar</p>
            <div className="space-y-5">
              <SignatureCanvas label="Firma de origen (quien entregó)" onSave={setSigOrigin} saved={sigOrigin || null} />
              <SignatureCanvas label="Firma de destino (quien recibe)" required onSave={setSigDest} saved={sigDest || null} />
            </div>
          </div>

          {hasDelta && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-orange-400 mb-2">⚠ Justificación Operativa (Requerido)</p>
              <textarea value={issueNote} onChange={(e) => setIssueNote(e.target.value)}
                placeholder="Explica qué bultos añadiste a mano o por qué hay diferencia en las cantidades..." rows={3}
                className="w-full bg-orange-950/20 border border-orange-500/30 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-600 resize-none focus:outline-none focus:border-orange-500/60" />
            </div>
          )}

          {/* Resultado */}
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-3">Resultado</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setFinalStatus("COMPLETADA")}
                className={`py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${finalStatus === "COMPLETADA" ? "bg-green-600 text-white border border-green-500" : "bg-white/5 border border-white/8 text-neutral-500"}`}>
                <CheckCircle2 size={16} /> Completado
              </button>
              <button onClick={() => setFinalStatus("CANCELADA")}
                className={`py-4 rounded-2xl font-black text-sm uppercase flex items-center justify-center gap-2 transition-all active:scale-95 ${finalStatus === "CANCELADA" ? "bg-red-700 text-white border border-red-600" : "bg-white/5 border border-white/8 text-neutral-500"}`}>
                <AlertTriangle size={16} /> Cancelado
              </button>
            </div>
          </div>

          {finalStatus === "CANCELADA" && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2">Motivo de cancelación *</p>
              <textarea value={issueNote} onChange={(e) => setIssueNote(e.target.value)}
                placeholder="Ej: Cliente no se encontraba, rechazo de mercancía..." rows={3}
                className="w-full bg-red-950/20 border border-red-700/30 rounded-2xl px-4 py-3 text-sm text-white placeholder-neutral-600 resize-none focus:outline-none" />
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-700/40 rounded-2xl px-4 py-3">
              <p className="text-red-400 text-xs font-bold">{error}</p>
            </div>
          )}

          <button
            onClick={confirmarEntrega}
            disabled={loading || (finalStatus === "COMPLETADA" && !sigDest) || (finalStatus === "CANCELADA" && !issueNote) || (hasDelta && !issueNote)}
            className="w-full bg-[#FDCB02] text-black font-black py-5 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Auditando GPS...</>
              : <><UploadCloud size={18} /> Confirmar y enviar</>
            }
          </button>
        </div>
      )}
    </div>
  );
}