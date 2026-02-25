// src/app/flotilla/mapa/MapaRuta.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Wifi, WifiOff, RefreshCw, MapPin, Truck, Package } from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Chofer {
  id: string;
  lat: number;
  lng: number;
  speed: number | null;
  isSpeeding: boolean;
  timestamp: string;
  employee: { id: string; name: string };
}

interface Parada {
  id: string;
  orderNumber: string;
  customerName: string;
  address: string | null;
  status: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
}

// ─── CDMX como centro por defecto ────────────────────────────────────────────
const DEFAULT_CENTER: [number, number] = [19.4326, -99.1332];
const DEFAULT_ZOOM = 12;
const REFRESH_INTERVAL = 15_000; // 15 segundos

export default function MapaRuta() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [paradas, setParadas] = useState<Parada[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [leafletReady, setLeafletReady] = useState(false);

  // ── 1. Cargar Leaflet dinámicamente (solo en cliente) ──────────────────────
  useEffect(() => {
    // Inyectar CSS de Leaflet
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => setLeafletReady(true);
    document.head.appendChild(script);

    return () => {};
  }, []);

  // ── 2. Inicializar mapa cuando Leaflet esté listo ──────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapRef.current || leafletMap.current) return;

    const L = (window as any).L;

    leafletMap.current = L.map(mapRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
    });

    // Tile oscuro de CartoDB para que combine con el diseño
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: '© <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }
    ).addTo(leafletMap.current);

    // Controles de zoom abajo a la derecha
    L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);
  }, [leafletReady]);

  // ── 3. Función para traer datos ────────────────────────────────────────────
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/flotilla/mapa-ruta");
      if (!res.ok) throw new Error("Error de red");
      const data = await res.json();
      setChoferes(data.choferes ?? []);
      setParadas(data.paradas ?? []);
      setIsOnline(true);
      setLastUpdate(new Date());
    } catch {
      setIsOnline(false);
    } finally {
      setIsLoading(false);
    }
  };

  // ── 4. Fetch inicial + polling cada 15s ────────────────────────────────────
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ── 5. Actualizar marcadores en el mapa ────────────────────────────────────
  useEffect(() => {
    if (!leafletMap.current || !leafletReady) return;
    const L = (window as any).L;

    // Limpiar marcadores anteriores
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    const puntosRuta: [number, number][] = [];

    // ── Marcadores de choferes (icono camión amarillo) ──────────────────────
    choferes.forEach((c) => {
      const speeding = c.isSpeeding;
      const iconHtml = `
        <div style="
          width:40px; height:40px;
          background:${speeding ? "#ef4444" : "#FDCB02"};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          border: 3px solid ${speeding ? "#991b1b" : "#b8950a"};
          box-shadow: 0 4px 12px rgba(0,0,0,0.4);
          display:flex; align-items:center; justify-content:center;
        ">
          <span style="transform:rotate(45deg); font-size:18px;">🚛</span>
        </div>`;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [40, 40],
        iconAnchor: [20, 40],
        popupAnchor: [0, -44],
      });

      const marker = L.marker([c.lat, c.lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`
          <div style="font-family:monospace; min-width:160px;">
            <p style="font-weight:900; font-size:13px; margin:0 0 4px; text-transform:uppercase;">
              ${c.employee.name}
            </p>
            <p style="font-size:11px; color:${speeding ? "#ef4444" : "#16a34a"}; font-weight:700; margin:0 0 2px;">
              ${speeding ? "⚠️ EXCESO" : "✅ Normal"} — ${c.speed ?? 0} km/h
            </p>
            <p style="font-size:10px; color:#6b7280; margin:0;">
              ${new Date(c.timestamp).toLocaleTimeString("es-MX")}
            </p>
          </div>
        `);

      markersRef.current.push(marker);
      puntosRuta.push([c.lat, c.lng]);
    });

    // ── Marcadores de paradas (número de parada) ────────────────────────────
    paradas.forEach((p, idx) => {
      if (!p.deliveryLat || !p.deliveryLng) return;

      const lat = p.deliveryLat;
      const lng = p.deliveryLng;

      const statusColor =
        p.status === "SHIPPED" ? "#3b82f6" :
        p.status === "DELIVERED" ? "#16a34a" : "#f59e0b";

      const iconHtml = `
        <div style="
          width:32px; height:32px;
          background:${statusColor};
          border-radius:50%;
          border: 3px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          display:flex; align-items:center; justify-content:center;
          font-weight:900; font-size:13px; color:white;
        ">${idx + 1}</div>`;

      const icon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`
          <div style="font-family:monospace; min-width:180px;">
            <p style="font-weight:900; font-size:12px; margin:0 0 3px; text-transform:uppercase;">
              Parada ${idx + 1}
            </p>
            <p style="font-size:11px; font-weight:700; margin:0 0 2px;">${p.customerName}</p>
            <p style="font-size:10px; color:#6b7280; margin:0 0 4px;">${p.address ?? "Sin dirección"}</p>
            <span style="
              display:inline-block;
              background:${statusColor}22;
              color:${statusColor};
              border:1px solid ${statusColor};
              border-radius:999px;
              padding:2px 8px;
              font-size:9px;
              font-weight:900;
              text-transform:uppercase;
              letter-spacing:0.1em;
            ">${p.status}</span>
          </div>
        `);

      markersRef.current.push(marker);
      puntosRuta.push([lat, lng]);
    });

    // ── Polyline conectando todos los puntos ────────────────────────────────
    if (puntosRuta.length > 1) {
      polylineRef.current = L.polyline(puntosRuta, {
        color: "#FDCB02",
        weight: 2.5,
        opacity: 0.6,
        dashArray: "8 6",
      }).addTo(leafletMap.current);
    }

    // Centrar mapa si hay puntos
    if (puntosRuta.length > 0) {
      leafletMap.current.fitBounds(L.latLngBounds(puntosRuta), { padding: [48, 48] });
    }
  }, [choferes, paradas, leafletReady]);

  // ─── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full min-h-[80vh] rounded-[2rem] overflow-hidden bg-[#0a0a0a] border border-white/10 shadow-2xl">

      {/* Mapa */}
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/* ── HUD SUPERIOR ───────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start gap-3 pointer-events-none">

        {/* Título */}
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3">
          <p className="text-[9px] font-black text-[#FDCB02] uppercase tracking-[0.25em] mb-0.5">
            Coyote Flotilla
          </p>
          <p className="text-xs font-black text-white uppercase tracking-widest leading-none">
            Mapa en Vivo
          </p>
        </div>

        {/* Estado conexión */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-[10px] font-black uppercase tracking-widest pointer-events-auto ${
          isOnline
            ? "bg-green-950/80 border-green-700/50 text-green-400"
            : "bg-red-950/80 border-red-700/50 text-red-400"
        }`}>
          {isOnline
            ? <><Wifi size={12} /> En Línea</>
            : <><WifiOff size={12} /> Sin Señal</>
          }
        </div>
      </div>

      {/* ── PANEL LATERAL DE STATS ─────────────────────────────────────────── */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-col gap-2">

        {/* Choferes activos */}
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#FDCB02] rounded-lg flex items-center justify-center shrink-0">
            <Truck size={14} className="text-black" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-0.5">Choferes</p>
            <p className="text-sm font-[900] text-white leading-none">{choferes.length} activos</p>
          </div>
        </div>

        {/* Paradas */}
        <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <Package size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest leading-none mb-0.5">Paradas</p>
            <p className="text-sm font-[900] text-white leading-none">{paradas.length} pendientes</p>
          </div>
        </div>

        {/* Alertas */}
        {choferes.some(c => c.isSpeeding) && (
          <div className="bg-red-950/80 backdrop-blur-md border border-red-700/50 rounded-xl px-3 py-2.5 flex items-center gap-2 animate-pulse">
            <span className="text-red-400 text-sm">🚨</span>
            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">
              {choferes.filter(c => c.isSpeeding).length} exceso velocidad
            </p>
          </div>
        )}
      </div>

      {/* ── BOTÓN REFRESH + TIMESTAMP ─────────────────────────────────────── */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col items-end gap-2">
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="bg-black/80 hover:bg-[#FDCB02] hover:text-black border border-white/10 hover:border-[#FDCB02] text-white backdrop-blur-md rounded-xl px-3 py-2.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
          Actualizar
        </button>
        {lastUpdate && (
          <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider bg-black/60 rounded-lg px-2 py-1">
            {lastUpdate.toLocaleTimeString("es-MX")}
          </p>
        )}
      </div>

      {/* ── LOADING OVERLAY (primera carga) ───────────────────────────────── */}
      {!leafletReady && (
        <div className="absolute inset-0 z-[2000] bg-[#0a0a0a] flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 bg-[#FDCB02] rounded-[1.5rem] flex items-center justify-center shadow-xl">
              <MapPin size={28} className="text-black" strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.25em]">
            Cargando Mapa...
          </p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="w-1.5 h-1.5 bg-[#FDCB02] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}