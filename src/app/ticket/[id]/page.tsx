import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Download, CheckCircle2 } from "lucide-react";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia" as any,
});

export default async function TicketPage({ params }: { params: { id: string } }) {
  try {
    const id = params.id;

    // Variables universales del ticket
    let date, customerName, method, total, items, displayId, stripeReceiptUrl;

    // ─────────────────────────────────────────────────────────────────
    // 🤖 CASO A: COMPRA POR WHATSAPP (Viene de Stripe Checkout Session)
    // ─────────────────────────────────────────────────────────────────
    if (id.startsWith("cs_")) {
      const session = await stripe.checkout.sessions.retrieve(id, {
        expand: ["line_items", "payment_intent.latest_charge"],
      });
      
      const pi = session.payment_intent as Stripe.PaymentIntent;
      const charge = pi?.latest_charge as Stripe.Charge;
      
      date = new Date((session.created || 0) * 1000).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
      customerName = session.customer_details?.name || "Cliente Coyote";
      method = pi?.payment_method_types?.[0] || "Pago Electrónico";
      total = (session.amount_total || 0) / 100;
      
      items = session.line_items?.data.map(i => ({ 
        qty: i.quantity, desc: i.description, total: (i.amount_total || 0) / 100 
      })) || [];
      
      displayId = session.id.slice(-10).toUpperCase();
      stripeReceiptUrl = charge?.receipt_url;

    // ─────────────────────────────────────────────────────────────────
    // 💻 CASO B: COMPRA POR WEB B2B (Viene de la BD Prisma)
    // ─────────────────────────────────────────────────────────────────
    } else {
      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true, user: true }
      });

      if (!order) throw new Error("Orden no encontrada en la base de datos.");

      date = order.createdAt.toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
      customerName = order.customerName || order.user?.name || "Cliente Web";
      method = order.paymentMethod === "stripe_custom" ? "Tarjeta / Transferencia" : order.paymentMethod;
      total = order.total;
      
      items = order.items.map(i => ({ 
        qty: i.quantity, desc: i.title, total: Number(i.price) * i.quantity 
      }));
      
      displayId = order.id.slice(-10).toUpperCase();
    }

    // ─────────────────────────────────────────────────────────────────
    // 🎨 RENDERIZADO DEL TICKET (Mismo diseño premium para ambos)
    // ─────────────────────────────────────────────────────────────────
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-mono text-zinc-300">
        <div className="bg-[#111] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500"></div>
          
          <div className="flex flex-col items-center text-center mb-8 pt-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
              <CheckCircle2 className="text-emerald-500" size={32} />
            </div>
            <h1 className="text-xl font-black text-white uppercase tracking-widest">Coyote Textil</h1>
            <p className="text-xs text-zinc-500 mt-1">Ticket Digital de Compra</p>
            <p className="text-[10px] text-zinc-600 mt-2">REF: {displayId}</p>
          </div>

          <div className="space-y-4 text-sm border-y border-white/5 py-6 mb-6">
            <div className="flex justify-between">
              <span className="text-zinc-500">Fecha</span>
              <span className="text-right">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Cliente</span>
              <span className="text-right truncate max-w-[200px]">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Método</span>
              <span className="text-right uppercase">{method}</span>
            </div>
          </div>

          <div className="mb-6 space-y-3">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Artículos</p>
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="truncate pr-4">{item.qty}x {item.desc}</span>
                <span>${item.total.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4 flex justify-between items-center text-lg font-black text-emerald-400">
            <span>TOTAL</span>
            <span>${Number(total).toFixed(2)} MXN</span>
          </div>

          {/* Botón para descargar el PDF oficial de Stripe (Solo si existe) */}
          {stripeReceiptUrl && (
            <div className="mt-8 pt-6 border-t border-white/5 flex gap-3">
              <a 
                href={stripeReceiptUrl} 
                target="_blank"
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Download size={14} /> PDF Fiscal
              </a>
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-center p-10 font-mono border border-white/10 rounded-2xl bg-[#111]">
          ⚠️ Error al cargar el ticket.<br/>Verifica que el ID sea correcto.
        </div>
      </div>
    );
  }
}