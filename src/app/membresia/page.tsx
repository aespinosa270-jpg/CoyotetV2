'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const fmx = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 0 }).format(n);

// ─────────────────────────────────────────────────────────────────────
// PLANES — metals 100% sólidos, sin ningún transparent en brushed
// ─────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 0, key: "BASE", tier: "Estándar", name: "Acceso Inicial", price: 0,
    planId: null as null | string,
    metal: {
      solid:   "#b4b4b4",  // color base opaco absoluto
      face:    "linear-gradient(152deg, #efefef 0%, #c4c4c4 18%, #e0e0e0 34%, #9c9c9c 52%, #cecece 68%, #868686 83%, #c0c0c0 100%)",
      // brushed: todos los stops son colores sólidos, cero transparent
      brushed: "repeating-linear-gradient(91deg, #b8b8b8 0px, #cccccc 0.8px, #b4b4b4 1.6px, #acacac 3px, #b8b8b8 4.2px)",
      hilight: "#f4f4f4",
      shadow:  "#282828",
      mid:     "#b0b0b0",
      glow:    "#cccccc",
      glowRgb: "200,200,200",
      text:    "#0e0e0e",
      subtext: "#4c4c4c",
      accent:  "#848484",
    },
    tag: "ALUMINIO", recommended: false,
    features: ["0.5 pts / $100 MXN", "Catálogo completo", "Panel de historial", "Sin apartados"],
  },
  {
    id: 1, key: "GOLD", tier: "Priority", name: "Socio Comercial", price: 499,
    planId: "price_gold_id",
    metal: {
      solid:   "#b87800",
      face:    "linear-gradient(152deg, #fff3a0 0%, #fdc800 16%, #e49000 32%, #ffd800 50%, #ac6c00 68%, #fcc800 82%, #bc7c00 100%)",
      brushed: "repeating-linear-gradient(88deg, #c08000 0px, #d89400 0.8px, #b87600 1.6px, #ac7000 3px, #c08000 4.2px)",
      hilight: "#fff8b8",
      shadow:  "#361400",
      mid:     "#e49c00",
      glow:    "#fdc800",
      glowRgb: "253,200,2",
      text:    "#180800",
      subtext: "#684000",
      accent:  "#bc7000",
    },
    tag: "ORO 24K", recommended: true,
    features: ["10% dto en textiles", "7 días de apartado", "3 colocaciones/mes", "1 pto / $100 MXN"],
  },
  {
    id: 2, key: "BLACK", tier: "Ejecutivo", name: "Socio Ejecutivo", price: 799,
    planId: "price_black_id",
    metal: {
      solid:   "#0c0c0c",
      face:    "linear-gradient(152deg, #2c2c2c 0%, #161616 18%, #242424 34%, #0c0c0c 52%, #1e1e1e 68%, #080808 83%, #181818 100%)",
      brushed: "repeating-linear-gradient(45deg, #0f0f0f 0px, #1a1a1a 0.8px, #0c0c0c 1.6px, #080808 3px, #0f0f0f 4.2px)",
      hilight: "#cccccc",
      shadow:  "#000000",
      mid:     "#3c3c3c",
      glow:    "#a8a8a8",
      glowRgb: "168,168,168",
      text:    "#e4e4e4",
      subtext: "#6c6c6c",
      accent:  "#969696",
    },
    tag: "CARBONO", recommended: false,
    features: ["15% dto en textiles", "6 colocaciones/mes", "2 ptos / $100 MXN", "Prioridad en paquetería", "Muestrarios gratis"],
  },
  {
    id: 3, key: "ELITE", tier: "Master", name: "Master Partner", price: 1129,
    planId: "price_elite_id",
    metal: {
      solid:   "#07111f",
      face:    "linear-gradient(152deg, #469acc 0%, #183c78 16%, #1e5cb8 32%, #0c1e4c 52%, #164ea4 68%, #071e3c 83%, #2468c8 100%)",
      brushed: "repeating-linear-gradient(86deg, #0a1830 0px, #122040 0.8px, #091422 1.6px, #060e1a 3px, #0a1830 4.2px)",
      hilight: "#98d0f8",
      shadow:  "#020608",
      mid:     "#185cb8",
      glow:    "#2c8cdc",
      glowRgb: "44,140,220",
      text:    "#d8ecfc",
      subtext: "#468cb8",
      accent:  "#56a8e0",
    },
    tag: "ZAFIRO", recommended: false,
    features: ["15% dto + envío local gratis", "15 días de apartado", "4 ptos / $100 MXN", "Acceso anticipado 30 días", "Gerente de cuenta"],
  },
] as const;

type Plan = typeof PLANS[number];

// ─────────────────────────────────────────────────────────────────────
// SHOWROOM CANVAS — reflectores industriales full animados
// ─────────────────────────────────────────────────────────────────────
function ShowroomBG({ glowRgb }: { glowRgb: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const glowRef   = useRef(glowRgb);
  glowRef.current = glowRgb;

  useEffect(() => {
    const c   = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    let t     = 0;

    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const SPOTS = [
      { ox: 0.12, sweep: 0.26, speed: 0.00065, phase: 0.00, r: 0.40, bright: 0.88 },
      { ox: 0.40, sweep: 0.20, speed: 0.00115, phase: 2.20, r: 0.32, bright: 0.72 },
      { ox: 0.68, sweep: 0.24, speed: 0.00085, phase: 4.50, r: 0.36, bright: 0.80 },
      { ox: 0.26, sweep: 0.14, speed: 0.00145, phase: 1.10, r: 0.24, bright: 0.50 },
      { ox: 0.84, sweep: 0.16, speed: 0.00058, phase: 3.70, r: 0.26, bright: 0.58 },
      { ox: 0.53, sweep: 0.10, speed: 0.00200, phase: 5.80, r: 0.18, bright: 0.38 },
    ];

    // Partículas de polvo
    const DUST = Array.from({ length: 140 }, () => ({
      x: Math.random(), y: Math.random() * 0.7,
      r: Math.random() * 1.0 + 0.2,
      vx: (Math.random() - 0.5) * 0.00012,
      vy: -Math.random() * 0.00008,
      phi: Math.random() * Math.PI * 2,
      dphi: Math.random() * 0.008 + 0.002,
      base: Math.random() * 0.05 + 0.01,
    }));

    const draw = () => {
      t++;
      const W = c.width, H = c.height;
      const rgb = glowRef.current;

      ctx.fillStyle = "#040404";
      ctx.fillRect(0, 0, W, H);

      // ── Piso en perspectiva ──
      const HY  = H * 0.695;
      const vpX = W * 0.50;

      // Líneas de fuga del piso
      ctx.lineWidth = 0.5;
      for (let i = -14; i <= 14; i++) {
        const alpha = Math.max(0, 0.055 - Math.abs(i) * 0.003);
        ctx.strokeStyle = `rgba(${rgb},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(vpX + i * (W / 13), HY);
        ctx.lineTo(vpX + i * W * 2.2, H * 1.5);
        ctx.stroke();
      }
      // Líneas horizontales
      for (let j = 0; j <= 9; j++) {
        const fy  = HY + (j / 9) * (H - HY) * 1.1;
        const sp  = 0.45 + j * 0.30;
        const a   = 0.012 + j * 0.005;
        ctx.strokeStyle = `rgba(${rgb},${a})`;
        ctx.beginPath();
        ctx.moveTo(vpX - sp * W, fy);
        ctx.lineTo(vpX + sp * W, fy);
        ctx.stroke();
      }

      // Riel de horizonte con brillo
      const rail = ctx.createLinearGradient(0, HY, W, HY);
      rail.addColorStop(0,   "rgba(0,0,0,0)");
      rail.addColorStop(0.15,`rgba(${rgb},0.08)`);
      rail.addColorStop(0.50,`rgba(${rgb},0.20)`);
      rail.addColorStop(0.85,`rgba(${rgb},0.08)`);
      rail.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.strokeStyle = rail; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, HY); ctx.lineTo(W, HY); ctx.stroke();

      // Reflejos en suelo (manchas especulares)
      for (let s = 0; s < 3; s++) {
        const sx   = W * (0.2 + s * 0.3);
        const refl = ctx.createRadialGradient(sx, HY, 0, sx, HY + 10, 180);
        refl.addColorStop(0,   `rgba(${rgb},0.06)`);
        refl.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = refl;
        ctx.fillRect(sx - 200, HY, 400, 120);
      }

      // ── Vigas del techo ──
      ctx.strokeStyle = `rgba(${rgb},0.055)`; ctx.lineWidth = 1;
      const beams = [0.10, 0.36, 0.64, 0.90];
      beams.forEach(bx => {
        ctx.beginPath();
        ctx.moveTo(bx * W, 0); ctx.lineTo(bx * W, H * 0.055);
        ctx.stroke();
      });
      // Viga horizontal del techo
      ctx.strokeStyle = `rgba(${rgb},0.04)`; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(W, 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, H * 0.055); ctx.lineTo(W, H * 0.055); ctx.stroke();

      // ── Reflectores ──
      SPOTS.forEach(sp => {
        const angle = 0.5 + Math.sin(t * sp.speed + sp.phase) * sp.sweep;
        const ox    = sp.ox * W;
        const oy    = H * 0.008;
        const reach = H * sp.r * 2.8;
        const sa    = (angle - 0.5) * Math.PI * 1.5;
        const ca    = Math.abs(Math.cos((angle - 0.5) * Math.PI * 0.6));
        const tx    = ox + Math.sin(sa) * reach * 0.80;
        const ty    = oy + ca * reach * 0.88 + reach * 0.50;
        const hw    = 0.115;

        const lx = ox + Math.sin((angle - 0.5 - hw) * Math.PI * 1.5) * reach * 1.1;
        const ly = oy + Math.abs(Math.cos((angle - 0.5 - hw) * Math.PI * 0.6)) * reach * 0.88 + reach * 0.50;
        const rx = ox + Math.sin((angle - 0.5 + hw) * Math.PI * 1.5) * reach * 1.1;
        const ry = oy + Math.abs(Math.cos((angle - 0.5 + hw) * Math.PI * 0.6)) * reach * 0.88 + reach * 0.50;

        // Cono de luz
        const cone = ctx.createRadialGradient(ox, oy, 0, tx, ty, reach * 0.42);
        cone.addColorStop(0,    `rgba(${rgb},${sp.bright * 0.22})`);
        cone.addColorStop(0.30, `rgba(${rgb},${sp.bright * 0.10})`);
        cone.addColorStop(0.70, `rgba(${rgb},${sp.bright * 0.028})`);
        cone.addColorStop(1,    "rgba(0,0,0,0)");
        ctx.save();
        ctx.fillStyle = cone;
        ctx.beginPath();
        ctx.moveTo(ox, oy + 2);
        ctx.lineTo(lx, ly);
        ctx.quadraticCurveTo(tx, Math.min(ty + 35, H * 0.92), rx, ry);
        ctx.closePath();
        ctx.fill();

        // Núcleo del haz
        const beam = ctx.createLinearGradient(ox, oy, tx, Math.min(ty, H * 0.9));
        beam.addColorStop(0,   `rgba(${rgb},${sp.bright * 0.40})`);
        beam.addColorStop(0.4, `rgba(${rgb},${sp.bright * 0.14})`);
        beam.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.strokeStyle = beam; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(tx, Math.min(ty, H * 0.9)); ctx.stroke();
        ctx.restore();

        // Mancha de impacto en suelo
        const groundY = Math.min(ty, H * 0.88);
        const spot    = ctx.createRadialGradient(tx, groundY, 0, tx, groundY, reach * 0.17);
        spot.addColorStop(0,   `rgba(${rgb},${sp.bright * 0.32})`);
        spot.addColorStop(0.5, `rgba(${rgb},${sp.bright * 0.09})`);
        spot.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.save();
        ctx.fillStyle = spot;
        ctx.beginPath();
        ctx.ellipse(tx, groundY, reach * 0.17, reach * 0.065, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Fixture (punto brillante en techo)
        const head = ctx.createRadialGradient(ox, oy, 0, ox, oy, 22);
        head.addColorStop(0,   `rgba(${rgb},0.98)`);
        head.addColorStop(0.25,`rgba(${rgb},0.45)`);
        head.addColorStop(0.6, `rgba(${rgb},0.10)`);
        head.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.save(); ctx.fillStyle = head;
        ctx.beginPath(); ctx.arc(ox, oy, 22, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      // ── Polvo flotante ──
      DUST.forEach(d => {
        d.x  = (d.x + d.vx + 1) % 1;
        d.y  = (d.y + d.vy + 1) % 0.7;
        d.phi += d.dphi;
        const a = d.base * (0.4 + 0.6 * Math.abs(Math.sin(d.phi)));
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle   = `rgb(${rgb})`;
        ctx.beginPath(); ctx.arc(d.x * W, d.y * H, d.r, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });

      // Viñeta fuerte
      const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.86)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none" }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// SCAN LINE
// ─────────────────────────────────────────────────────────────────────
function ScanLine({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ top: "0%" }} animate={{ top: "105%" }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "linear", repeatDelay: 2.8 }}
      style={{
        position: "absolute", left: 0, right: 0, height: 2,
        pointerEvents: "none", zIndex: 10,
        background: `linear-gradient(90deg, transparent 0%, ${color}66 18%, ${color} 50%, ${color}66 82%, transparent 100%)`,
        boxShadow: `0 0 14px 5px ${color}44, 0 0 4px 1px ${color}88`,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// CORNER GLEAM — destello en esquina animado
// ─────────────────────────────────────────────────────────────────────
function CornerGleam({ color }: { color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -60, y: -60 }}
      animate={{ opacity: [0, 0.9, 0], x: ["-30%", "130%"], y: ["-30%", "130%"] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 4.5 }}
      style={{
        position: "absolute", top: 0, left: 0,
        width: 80, height: 80, borderRadius: "50%",
        background: `radial-gradient(circle, ${color}cc 0%, transparent 70%)`,
        filter: "blur(8px)",
        pointerEvents: "none", zIndex: 9,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────
// TARJETA METÁLICA — completamente opaca, sin transparencias
// ─────────────────────────────────────────────────────────────────────
function MetalCard({
  plan, isActive, offset, onClick,
}: {
  plan: Plan; isActive: boolean; offset: number; onClick: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const mx  = useMotionValue(0);
  const my  = useMotionValue(0);
  const rx  = useSpring(useTransform(my, [-0.5, 0.5], ["20deg", "-20deg"]), { stiffness: 420, damping: 36 });
  const ry  = useSpring(useTransform(mx, [-0.5, 0.5], ["-20deg", "20deg"]), { stiffness: 420, damping: 36 });
  // Sheen x/y en porcentaje para radial-gradient
  const shX = useTransform(mx, [-0.5, 0.5], ["5%", "95%"]);
  const shY = useTransform(my, [-0.5, 0.5], ["5%", "95%"]);

  const onMove = (e: React.MouseEvent) => {
    if (!isActive || !cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width  - 0.5);
    my.set((e.clientY - r.top)  / r.height - 0.5);
  };
  const onLeave = () => { mx.set(0); my.set(0); };

  const { metal: m } = plan;
  const sc = isActive ? 1.06 : 0.75 - Math.abs(offset) * 0.08;
  const tx = isActive ? 0    : offset * 64;
  const ty = isActive ? 0    : Math.abs(offset) * 14 + offset * 4;

  return (
    <motion.div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        position: "absolute",
        zIndex:  isActive ? 50 : 10 - Math.abs(offset),
        rotateX: isActive ? rx : (22 + Math.abs(offset) * 5) as any,
        rotateY: isActive ? ry : 0,
        cursor:  isActive ? "default" : "pointer",
        opacity: 1, // Garantizamos opacidad al 100%
      }}
      animate={{ x: tx, y: ty, scale: sc, filter: isActive ? "brightness(1)" : "brightness(0.28) blur(2px)" }}
      transition={{ type: "spring", stiffness: 72, damping: 20 }}
      whileHover={!isActive ? { scale: sc + 0.05, filter: "brightness(0.53) blur(2px)" } : {}}
    >
      {/* Sombra proyectada */}
      {isActive && (
        <motion.div
          animate={{ opacity: [0.4, 0.7, 0.4], scaleX: [1, 1.08, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute", bottom: -48, left: "6%", right: "6%", height: 60,
            background: `radial-gradient(ellipse, ${m.glow}55 0%, transparent 72%)`,
            filter: "blur(24px)", pointerEvents: "none",
          }}
        />
      )}

      {/* ── CUERPO — backgroundColor sólido como "suelo" garantizado ── */}
      <div
        style={{
          width: 458, height: 286, borderRadius: 18,
          position: "relative", overflow: "hidden",
          isolation: "isolate",       // 🔥 FIX: Aísla la tarjeta para evitar perforaciones de WebKit
          transform: "translateZ(0)", // 🔥 FIX: Obliga a renderizar la tarjeta en un layer plano separado
          // Primer: color sólido de fondo absoluto
          backgroundColor: m.solid,
          // Segundo: face gradient encima (cubre todo, también opaco)
          background: m.face,
          // Sombras externas
          boxShadow: isActive
            ? [
                `0 65px 120px #000`,
                `0 32px 55px rgba(0,0,0,0.72)`,
                `inset 0 2px 0 ${m.hilight}`,
                `inset 0 -1px 0 ${m.shadow}`,
                `0 0 0 1.5px ${m.shadow}`,
              ].join(", ")
            : `0 20px 40px rgba(0,0,0,0.75), inset 0 1px 0 ${m.hilight}22`,
        }}
      >
        {/* 1. Brushed metal — 100% sólido, cero transparent */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          backgroundImage: m.brushed,
        }} />

        {/* 2. Reflejo especular fijo en esquina superior-izquierda */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: `radial-gradient(ellipse 62% 48% at 22% 20%, ${m.hilight}62 0%, ${m.solid}00 58%)`,
        }} />

        {/* 3. Bisel / chamfer edge */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: 18, zIndex: 3, pointerEvents: "none",
          background: `linear-gradient(152deg, ${m.hilight}50 0%, ${m.solid}00 24%, ${m.solid}00 76%, ${m.shadow}60 100%)`,
        }} />

        {/* 4. Sheen dinámico de cursor sin mixBlendMode para evitar bugs de WebKit */}
        {isActive && (
          <motion.div style={{
            position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
            background: `radial-gradient(ellipse 40% 40% at ${shX} ${shY}, ${m.hilight}50 0%, transparent 62%)`,
          }} />
        )}

        {/* 5. Scan line */}
        {isActive && <ScanLine color={m.accent} />}

        {/* 6. Corner gleam animado */}
        {isActive && <CornerGleam color={m.hilight} />}

        {/* ── CONTENIDO ── */}
        <div style={{ position: "relative", zIndex: 5, height: "100%", padding: "24px 28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 37, height: 37, borderRadius: 8,
                backgroundColor: m.shadow,
                border: `1.5px solid ${m.accent}60`,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `inset 0 1px 0 ${m.hilight}22, 0 2px 4px ${m.shadow}80`,
              }}>
                <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 10, color: m.hilight, letterSpacing: "0.06em" }}>CY</span>
              </div>
              <div>
                <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 8, letterSpacing: "0.22em", color: m.subtext, textTransform: "uppercase", margin: 0 }}>COYOTE TEXTIL</p>
                <p style={{ fontFamily: "monospace", fontSize: 7, color: m.accent, margin: 0, letterSpacing: "0.14em" }}>INFRAESTRUCTURA NACIONAL</p>
              </div>
            </div>
            <div style={{
              borderRadius: 4, padding: "3px 9px",
              backgroundColor: m.shadow,
              border: `1px solid ${m.accent}60`,
              boxShadow: `inset 0 1px 0 ${m.hilight}16`,
            }}>
              <span style={{ fontFamily: "monospace", fontSize: 7, color: m.subtext, fontWeight: 700, letterSpacing: "0.18em" }}>{plan.tag}</span>
            </div>
          </div>

          {/* KEY grabado metálico (sin filtro de drop-shadow para evitar perforación en WebKit) */}
          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <span style={{
              fontFamily: "monospace", fontWeight: 700, fontSize: 92, letterSpacing: "0.08em",
              color: "transparent",
              backgroundImage: `linear-gradient(172deg, ${m.hilight} 0%, ${m.mid} 44%, ${m.shadow} 100%)`,
              backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              display: "block",
              userSelect: "none",
            }}>{plan.key}</span>
          </div>

          {/* Footer (Sin el chip EMV) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <p style={{ fontFamily: "monospace", fontSize: 7, color: m.accent, letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 4, fontWeight: 700 }}>CREDENCIAL DE ACCESO</p>
              <p style={{ fontFamily: "monospace", fontSize: 11, color: m.text, letterSpacing: "0.10em", fontWeight: 700 }}>MX-{plan.id}9 •••• 2026</p>
            </div>
          </div>
        </div>

        {/* Borde interior en relieve */}
        <div style={{ position: "absolute", inset: 2, borderRadius: 16, border: `1px solid ${m.hilight}16`, zIndex: 6, pointerEvents: "none" }} />

        {/* Corner lights — chamfer óptico */}
        {[
          { top: 0,    left:  0,    background: `linear-gradient(135deg, ${m.hilight}48 0%, ${m.solid}00 52%)`, borderRadius: "18px 0 0 0" },
          { top: 0,    right: 0,    background: `linear-gradient(225deg, ${m.hilight}28 0%, ${m.solid}00 52%)`, borderRadius: "0 18px 0 0" },
          { bottom: 0, left:  0,    background: `linear-gradient(45deg,  ${m.hilight}16 0%, ${m.solid}00 52%)`, borderRadius: "0 0 0 18px" },
          { bottom: 0, right: 0,    background: `linear-gradient(315deg, ${m.hilight}16 0%, ${m.solid}00 52%)`, borderRadius: "0 0 18px 0" },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 34, height: 34, zIndex: 7, pointerEvents: "none", ...s }} />
        ))}
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// STRIPE FORM
// ─────────────────────────────────────────────────────────────────────
function StripeForm({ plan, price, billing, onClose }: {
  plan: Plan; price: number; billing: string; onClose: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const m = plan.metal;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true); setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/perfil?status=success&plan=${plan.key}` },
    });
    if (err) { setError(err.message || "Error procesando el pago"); setLoading(false); }
  };

  return (
    <div style={{ backgroundColor: "#0a0a0a", borderRadius: 22, overflow: "hidden", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div style={{ padding: "22px 26px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <p style={{ fontFamily: "monospace", fontSize: 8, letterSpacing: "0.25em", color: "rgba(255,255,255,0.22)", textTransform: "uppercase", marginBottom: 6 }}>PAGO SEGURO · STRIPE</p>
          <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 18, letterSpacing: "0.06em", color: m.glow }}>PLAN {plan.key} — {fmx(price)} MXN</p>
          <p style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,0.18)", marginTop: 4, letterSpacing: "0.1em" }}>{billing === "annual" ? "FACTURACIÓN ANUAL" : "FACTURACIÓN MENSUAL"}</p>
        </div>
        <button onClick={() => !loading && onClose()} style={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14 }}>✕</button>
      </div>
      <form onSubmit={submit} style={{ padding: "22px 26px" }}>
        {error && (
          <div style={{ backgroundColor: "#1a0808", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "9px 13px", marginBottom: 14, fontFamily: "monospace", fontSize: 10, color: "#f87171", letterSpacing: "0.08em" }}>
            ERROR: {error}
          </div>
        )}
        <div style={{ backgroundColor: "#111", borderRadius: 12, padding: 12, marginBottom: 18 }}>
          <PaymentElement options={{ layout: "tabs" }} />
        </div>
        <button type="submit" disabled={loading || !stripe} style={{
          width: "100%", height: 50, borderRadius: 10, cursor: loading ? "wait" : "pointer",
          background: loading ? "#1a1a1a" : m.face,
          color: m.text, fontFamily: "monospace", fontWeight: 700,
          fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
          border: `1px solid ${m.hilight}22`,
          boxShadow: loading ? "none" : `0 6px 22px ${m.glow}55`,
          position: "relative", overflow: "hidden",
        }}>
          {!loading && <div style={{ position: "absolute", inset: 0, backgroundImage: m.brushed, opacity: 0.5, pointerEvents: "none" }} />}
          <span style={{ position: "relative" }}>{loading ? "PROCESANDO…" : "CONFIRMAR SUSCRIPCIÓN"}</span>
        </button>
        <p style={{ textAlign: "center", fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.10)", letterSpacing: "0.18em", marginTop: 12 }}>PCI-DSS · TLS 1.3 · STRIPE</p>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────
export default function MembershipPage() {
  const [activeIdx,    setActiveIdx]    = useState(1);
  const [billing,      setBilling]      = useState<"monthly" | "annual">("monthly");
  const [loading,      setLoading]      = useState(false);
  const [showVault,    setShowVault]    = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const plan    = PLANS[activeIdx];
  const m       = plan.metal;
  const isAnn   = billing === "annual";
  const price   = isAnn ? Math.round(plan.price * 12 * 0.9) : plan.price;
  const savings = Math.round(plan.price * 12 - price);

  const next = useCallback(() => setActiveIdx(p => (p + 1) % PLANS.length), []);
  const prev = useCallback(() => setActiveIdx(p => (p - 1 + PLANS.length) % PLANS.length), []);

  const handleBuy = async () => {
    if (plan.price === 0) { window.location.href = "/perfil?status=success"; return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/membership/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planKey: plan.key, billingCycle: billing }) });
      const data = await res.json();
      if (res.ok && data.clientSecret) { setClientSecret(data.clientSecret); setShowVault(true); }
      else throw new Error(data.error || "Error al iniciar el pago");
    } catch (e: any) { alert(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  if (!mounted) return null;

  const visible = PLANS.map((p, i) => {
    let off = i - activeIdx;
    if (off < -2) off += PLANS.length;
    if (off >  2) off -= PLANS.length;
    return { plan: p, index: i, offset: off };
  }).filter(({ offset }) => Math.abs(offset) <= 1);

  return (
    <>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } body { overflow: hidden; background: #040404; }`}</style>

      <div style={{ width: "100vw", height: "100vh", overflow: "hidden", backgroundColor: "#040404", display: "flex", position: "relative" }}>

        {/* ── SHOWROOM BG — se rehace al cambiar de plan ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`bg-${activeIdx}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.85 }}
            style={{ position: "absolute", inset: 0, zIndex: 0 }}
          >
            <ShowroomBG glowRgb={m.glowRgb} />
          </motion.div>
        </AnimatePresence>

        {/* Grid industrial */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.011) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.011) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />

        {/* ── IZQUIERDA ── */}
        {/* 🔥 FIX: Eliminado transformStyle: preserve-3d del contenedor padre que causaba que las tarjetas se perforaran entre ellas */}
        <div style={{ width: "52%", height: "100%", position: "relative", zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", perspective: "2800px" }}>

          {/* Nav buttons */}
          {([["left", prev, "‹"], ["right", next, "›"]] as const).map(([side, fn, sym]) => (
            <motion.button
              key={side} onClick={fn}
              whileHover={{ scale: 1.14, borderColor: m.glow, color: m.glow } as any}
              whileTap={{ scale: 0.93 }}
              style={{
                position: "absolute", [side]: 22, top: "50%", transform: "translateY(-50%)",
                zIndex: 20, width: 42, height: 42, borderRadius: "50%",
                backgroundColor: "#080808",
                border: "1px solid rgba(255,255,255,0.10)",
                color: "rgba(255,255,255,0.30)", fontSize: 22,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontFamily: "monospace",
                transition: "border-color 0.2s, color 0.2s",
              }}
            >{sym}</motion.button>
          ))}

          {/* Stack 3D */}
          <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AnimatePresence mode="popLayout">
              {visible.map(({ plan: p, index, offset }) => (
                <MetalCard key={p.key} plan={p} isActive={index === activeIdx} offset={offset} onClick={() => setActiveIdx(index)} />
              ))}
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div style={{ position: "absolute", bottom: 30, display: "flex", gap: 8, zIndex: 20 }}>
            {PLANS.map((_, i) => (
              <motion.button
                key={i} onClick={() => setActiveIdx(i)}
                animate={{ width: i === activeIdx ? 28 : 6, opacity: i === activeIdx ? 1 : 0.2 }}
                style={{
                  height: 6, borderRadius: 3, cursor: "pointer", border: "none",
                  backgroundColor: i === activeIdx ? m.glow : "#3c3c3c",
                  boxShadow: i === activeIdx ? `0 0 10px ${m.glow}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, alignSelf: "stretch", margin: "52px 0", flexShrink: 0, zIndex: 10, background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 22%, rgba(255,255,255,0.06) 78%, transparent)" }} />

        {/* ── DERECHA ── */}
        <div style={{ flex: 1, height: "100%", position: "relative", zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 52px", overflow: "hidden" }}>

          {/* Número gigante de fondo */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`bgn-${activeIdx}`}
              initial={{ opacity: 0, scale: 1.2, y: 40 }} animate={{ opacity: 0.022, scale: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 1.1 }}
              style={{ position: "absolute", bottom: -100, right: -20, fontFamily: "monospace", fontWeight: 700, fontSize: 300, lineHeight: 1, color: "white", pointerEvents: "none", userSelect: "none", zIndex: 0 }}
            >{String(plan.id + 1).padStart(2, "0")}</motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeIdx}
              initial={{ opacity: 0, x: 32, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0,  filter: "blur(0px)" }}
              exit={{   opacity: 0, x: -20, filter: "blur(5px)" }}
              transition={{ type: "spring", damping: 28, stiffness: 175 }}
              style={{ position: "relative", zIndex: 1, maxWidth: 400 }}
            >
              {/* Tier + dot pulsante */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5], boxShadow: [`0 0 4px ${m.glow}`, `0 0 16px ${m.glow}`, `0 0 4px ${m.glow}`] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                  style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: m.glow, flexShrink: 0 }}
                />
                <span style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.28em", color: m.subtext, textTransform: "uppercase" }}>
                  {plan.tier} · {plan.tag}
                </span>
                {plan.recommended && (
                  <motion.span
                    initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                    style={{
                      fontFamily: "monospace", fontSize: 7, letterSpacing: "0.18em", textTransform: "uppercase",
                      padding: "2px 8px", borderRadius: 3,
                      background: m.face,
                      color: m.text, fontWeight: 700,
                      boxShadow: `0 0 14px ${m.glow}55`,
                    }}
                  >RECOMENDADO</motion.span>
                )}
              </div>

              {/* Nombre */}
              <h1 style={{
                fontFamily: "monospace", fontWeight: 700, fontSize: 50, letterSpacing: "-0.01em", lineHeight: 0.92,
                color: "transparent",
                backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.94) 0%, ${m.glow} 55%, rgba(255,255,255,0.32) 100%)`,
                backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>{plan.name}</h1>

              <p style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: "0.26em", color: "rgba(255,255,255,0.10)", textTransform: "uppercase", marginTop: 8, marginBottom: 18 }}>
                COYOTE TEXTIL · MEMBRESÍA {plan.key}
              </p>

              {/* Línea animada */}
              <motion.div
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ delay: 0.07, duration: 0.5 }}
                style={{ height: 1, marginBottom: 20, background: `linear-gradient(90deg, ${m.glow}90, ${m.glow}22, transparent)`, transformOrigin: "left" }}
              />

              {/* Features */}
              <div style={{ marginBottom: 26 }}>
                {plan.features.map((feat, i) => (
                  <motion.div key={feat}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 + i * 0.055, type: "spring", stiffness: 220, damping: 24 }}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 0" }}
                  >
                    <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: m.glow, boxShadow: `0 0 7px ${m.glow}`, flexShrink: 0 }} />
                    <span style={{ fontFamily: "monospace", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(255,255,255,0.46)" }}>{feat}</span>
                  </motion.div>
                ))}
              </div>

              {/* Precio + CTA */}
              {plan.price > 0 ? (
                <>
                  {/* Billing toggle */}
                  <div style={{ display: "inline-flex", gap: 3, backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 3, marginBottom: 18 }}>
                    {(["monthly", "annual"] as const).map(b => (
                      <button key={b} onClick={() => setBilling(b)} style={{
                        padding: "6px 15px", borderRadius: 5, cursor: "pointer",
                        background: billing === b ? m.face : "transparent",
                        border: `1px solid ${billing === b ? m.hilight + "20" : "transparent"}`,
                        color: billing === b ? m.text : "rgba(255,255,255,0.22)",
                        fontFamily: "monospace", fontWeight: 700, fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase",
                        boxShadow: billing === b ? `0 2px 12px ${m.glow}30` : "none",
                        position: "relative", overflow: "hidden", transition: "all 0.22s",
                      }}>
                        {billing === b && <div style={{ position: "absolute", inset: 0, backgroundImage: m.brushed, opacity: 0.5, pointerEvents: "none" }} />}
                        <span style={{ position: "relative" }}>{b === "monthly" ? "MENSUAL" : "ANUAL −10%"}</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
                    <div>
                      <AnimatePresence mode="wait">
                        <motion.p key={price}
                          initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
                          style={{
                            fontFamily: "monospace", fontWeight: 700, fontSize: 54, lineHeight: 1,
                            color: "transparent",
                            backgroundImage: `linear-gradient(135deg, #fff 0%, ${m.glow} 55%, rgba(255,255,255,0.38) 100%)`,
                            backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                          }}
                        >{fmx(price)}</motion.p>
                      </AnimatePresence>
                      <p style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.15)", letterSpacing: "0.2em", marginTop: 4 }}>MXN / {isAnn ? "AÑO" : "MES"}</p>
                      {isAnn && (
                        <motion.p initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}
                          style={{ fontFamily: "monospace", fontSize: 9, color: m.glow, marginTop: 5, letterSpacing: "0.1em" }}>
                          AHORRO: {fmx(savings)}
                        </motion.p>
                      )}
                    </div>

                    {/* CTA */}
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={handleBuy} disabled={loading}
                      style={{
                        height: 50, paddingInline: 28, borderRadius: 10, cursor: loading ? "wait" : "pointer",
                        background: loading ? "#111" : m.face,
                        color: m.text, fontFamily: "monospace", fontWeight: 700, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase",
                        border: `1px solid ${m.hilight}22`,
                        boxShadow: loading ? "none" : `0 6px 28px ${m.glow}60, inset 0 1px 0 ${m.hilight}35`,
                        position: "relative", overflow: "hidden", transition: "box-shadow 0.3s",
                      }}
                    >
                      <div style={{ position: "absolute", inset: 0, backgroundImage: m.brushed, opacity: 0.55, pointerEvents: "none" }} />
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "42%", background: `linear-gradient(to bottom, ${m.hilight}28, transparent)`, pointerEvents: "none" }} />
                      <span style={{ position: "relative" }}>{loading ? "CARGANDO…" : "ACTIVAR PLAN"}</span>
                    </motion.button>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
                  <div>
                    <p style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 54, lineHeight: 1, color: "rgba(255,255,255,0.88)" }}>GRATIS</p>
                    <p style={{ fontFamily: "monospace", fontSize: 8, color: "rgba(255,255,255,0.16)", letterSpacing: "0.2em", marginTop: 4 }}>ACCESO DE CORTESÍA</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={handleBuy}
                    style={{ height: 50, paddingInline: 28, borderRadius: 10, cursor: "pointer", backgroundColor: "#0e0e0e", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.6)", fontFamily: "monospace", fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", transition: "all 0.2s" }}>
                    EMPEZAR
                  </motion.button>
                </div>
              )}

              {/* Security */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                style={{ display: "flex", gap: 16, marginTop: 26, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                {["PCI-DSS", "TLS 1.3", "STRIPE"].map(label => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "rgba(80,220,120,0.55)", boxShadow: "0 0 6px rgba(80,220,120,0.45)" }} />
                    <span style={{ fontFamily: "monospace", fontSize: 7, letterSpacing: "0.18em", color: "rgba(255,255,255,0.10)" }}>{label}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── MODAL STRIPE ── */}
      <AnimatePresence>
        {showVault && clientSecret && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backgroundColor: "rgba(0,0,0,0.96)", backdropFilter: "blur(22px)" }}
          >
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", overflow: "hidden" }}>
              <motion.div
                animate={{ scale: [0.82, 1.1, 0.82] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: 580, height: 580, borderRadius: "50%", background: `radial-gradient(circle, ${m.glow}1a 0%, transparent 70%)`, filter: "blur(140px)" }}
              />
            </div>
            <motion.div
              initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 200 }}
              style={{ position: "relative", width: "100%", maxWidth: 430, zIndex: 10 }}
            >
              <div style={{ position: "absolute", inset: -1, borderRadius: 23, background: `linear-gradient(135deg, ${m.glow}28, transparent 50%, ${m.glow}14)`, pointerEvents: "none" }} />
              <Elements stripe={stripePromise} options={{
                clientSecret,
                appearance: {
                  theme: "night",
                  variables: { colorPrimary: m.glow, colorBackground: "#111111", colorText: "#ffffff", colorDanger: "#ef4444", fontFamily: "monospace", borderRadius: "10px" },
                  rules: {
                    ".Input": { border: "1px solid rgba(255,255,255,0.08)", boxShadow: "none", padding: "11px" },
                    ".Input:focus": { border: `1px solid ${m.accent}` },
                    ".Label": { fontWeight: "700", textTransform: "uppercase", fontSize: "0.7rem", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" },
                  }
                }
              }}>
                <StripeForm plan={plan} price={price} billing={billing} onClose={() => setShowVault(false)} />
              </Elements>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}