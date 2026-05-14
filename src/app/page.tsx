"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { products } from "@/lib/products"
import { useCart } from "@/lib/context/cart-context"
import { useSession } from "next-auth/react"
import {
  Plus, Minus, Check, ArrowRight,
  Flag, Zap, Star, Ruler, Sun, Weight,
  BicepsFlexed, Package, Search, SlidersHorizontal, X,
  Truck, ChevronRight,
} from "lucide-react"
import Image from "next/image"
import Lenis from "lenis"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type SortOption = "relevance" | "price_asc" | "price_desc" | "gsm"

interface FilterState {
  query: string
  categories: Set<string>
  gsmRange: number | null
  sort: SortOption
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const GSM_RANGES = [
  { label: "< 120 gsm", fn: (g: number) => g < 120 },
  { label: "120–150",   fn: (g: number) => g >= 120 && g <= 150 },
  { label: "151–200",   fn: (g: number) => g > 150 && g <= 200 },
  { label: "> 200 gsm", fn: (g: number) => g > 200 },
]

const CATEGORY_LABELS = [
  "Deportivas / Sublimación",
  "Deportivo / Licra",
  "Escolar / Deportivo",
  "Línea Invernal",
  "Telas Técnicas",
]

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
const formatMoney = (amount: number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
  }).format(amount)

// ─────────────────────────────────────────────
// INTRO LOADER
// ─────────────────────────────────────────────
function IntroLoader() {
  const [isVisible, setIsVisible] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname !== "/") {
      setIsVisible(false)
      document.body.style.overflow = "auto"
      return
    }
    setIsVisible(true)
    document.body.style.overflow = "hidden"
    const t = setTimeout(handleVideoComplete, 6000)
    return () => clearTimeout(t)
  }, [pathname])

  const handleVideoComplete = () => {
    setIsVisible(false)
    document.body.style.overflow = "auto"
  }

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 bg-black -z-10" />
          <video
            src="/i-coyote.mp4"
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            onEnded={handleVideoComplete}
            onError={handleVideoComplete}
          />
          <button
            onClick={handleVideoComplete}
            className="absolute bottom-12 right-8 text-[10px] font-black text-white/40 hover:text-white uppercase tracking-[0.2em] border border-white/10 hover:border-white px-5 py-2 rounded-full transition-all z-50 backdrop-blur-sm"
          >
            Saltar
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─────────────────────────────────────────────
// FILTER BAR
// ─────────────────────────────────────────────
interface FilterBarProps {
  categories: string[]
  totalCount: number
  filteredCount: number
  filters: FilterState
  onFilterChange: (f: FilterState) => void
}

function FilterBar({ categories, totalCount, filteredCount, filters, onFilterChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const active = filters.categories.size > 0 || filters.gsmRange !== null || filters.query.length > 0
  const activeCount = filters.categories.size + (filters.gsmRange !== null ? 1 : 0)

  function update(partial: Partial<FilterState>) {
    onFilterChange({ ...filters, ...partial })
  }

  function toggleCat(cat: string) {
    const next = new Set(filters.categories)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    update({ categories: next })
  }

  function toggleGsm(idx: number) {
    update({ gsmRange: filters.gsmRange === idx ? null : idx })
  }

  function clearAll() {
    onFilterChange({ query: "", categories: new Set(), gsmRange: null, sort: "relevance" })
    setExpanded(false)
  }

  const chip = (isActive: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-[900] uppercase tracking-wider transition-all cursor-pointer ${
      isActive
        ? "bg-[#FDCB02] border-[#FDCB02] text-black"
        : "border-white/10 text-neutral-500 hover:border-white/30 hover:text-white"
    }`

  return (
    <div className="sticky top-[64px] z-[90] w-full bg-[#070707]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3 flex-wrap md:flex-nowrap">

        {/* Search */}
        <div className="flex items-center gap-2 w-full md:w-auto md:max-w-[220px] bg-[#111] border border-white/10 rounded-md px-3 h-9 focus-within:border-[#FDCB02] transition-colors shrink-0">
          <Search size={13} className="text-neutral-600 shrink-0" />
          <input
            type="text"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Buscar tela..."
            className="bg-transparent flex-1 text-[11px] font-bold text-white placeholder:text-neutral-700 outline-none uppercase tracking-wider min-w-0"
          />
          {filters.query && (
            <button onClick={() => update({ query: "" })}>
              <X size={12} className="text-neutral-500 hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide min-w-0">
          {categories.map((cat) => (
            <button key={cat} onClick={() => toggleCat(cat)} className={chip(filters.categories.has(cat))}>
              {cat}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          <span className="text-[10px] font-bold hidden md:block">
            {filteredCount === totalCount ? (
              <span className="text-neutral-600">{totalCount} refs</span>
            ) : (
              <>
                <span className="text-[#FDCB02] font-black">{filteredCount}</span>
                <span className="text-neutral-700">/{totalCount}</span>
              </>
            )}
          </span>

          <button
            onClick={() => setExpanded((v) => !v)}
            className={`flex items-center gap-2 px-3 h-8 rounded-md border text-[10px] font-[900] uppercase tracking-widest transition-all ${
              expanded || active
                ? "bg-[#FDCB02] border-[#FDCB02] text-black"
                : "border-white/10 text-neutral-500 hover:border-white/30 hover:text-white"
            }`}
          >
            <SlidersHorizontal size={12} />
            <span className="hidden sm:inline">Filtros</span>
            {activeCount > 0 && (
              <span className="bg-black/20 rounded-full px-1.5 py-0.5 text-[9px] font-black">{activeCount}</span>
            )}
          </button>

          <select
            value={filters.sort}
            onChange={(e) => update({ sort: e.target.value as SortOption })}
            className="h-8 bg-[#111] border border-white/10 text-[10px] font-[900] text-neutral-400 uppercase tracking-wider rounded-md px-2 outline-none hover:border-white/30 transition-colors cursor-pointer"
          >
            <option value="relevance">Relevancia</option>
            <option value="price_asc">Precio ↑</option>
            <option value="price_desc">Precio ↓</option>
            <option value="gsm">Gramaje</option>
          </select>
        </div>
      </div>

      {/* Panel expandido */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 flex flex-wrap gap-6 items-end">
              <div>
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Gramaje (gsm)</p>
                <div className="flex flex-wrap gap-2">
                  {GSM_RANGES.map((r, i) => (
                    <button key={i} onClick={() => toggleGsm(i)} className={chip(filters.gsmRange === i)}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              {active && (
                <button
                  onClick={clearAll}
                  className="ml-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-400/40 px-3 py-1.5 rounded-md"
                >
                  <X size={12} /> Limpiar filtros
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────
// HOOK: aplica filtros
// ─────────────────────────────────────────────
function useFilteredProducts(allProducts: any[], filters: FilterState) {
  return useMemo(() => {
    let result = [...allProducts]

    if (filters.query) {
      const q = filters.query.toLowerCase()
      result = result.filter(
        (p) =>
          p.title?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.composicion?.toLowerCase().includes(q) ||
          String(p.gramaje).includes(q)
      )
    }

    if (filters.categories.size > 0) {
      result = result.filter((p) => filters.categories.has(p.category))
    }

    if (filters.gsmRange !== null) {
      result = result.filter((p) => GSM_RANGES[filters.gsmRange!].fn(Number(p.gramaje)))
    }

    switch (filters.sort) {
      case "price_asc":
        result.sort((a, b) => (a.prices?.menudeo ?? 0) - (b.prices?.menudeo ?? 0))
        break
      case "price_desc":
        result.sort((a, b) => (b.prices?.menudeo ?? 0) - (a.prices?.menudeo ?? 0))
        break
      case "gsm":
        result.sort((a, b) => Number(a.gramaje) - Number(b.gramaje))
        break
    }

    return result
  }, [allProducts, filters])
}

// ─────────────────────────────────────────────
// PRODUCT CARD
// ─────────────────────────────────────────────
const ProductCard = ({ product, className = "" }: { product: any; className?: string }) => {
  const { addItem } = useCart()
  const { data: session } = useSession()
  const tier = (session?.user as any)?.membershipTier ?? "NONE"
  const isGold = tier === "GOLD"
  const isBlack = tier === "BLACK"
  const isElite = tier === "ELITE"
  const hasDiscount = isGold || isBlack || isElite
  const discountMultiplier = isBlack || isElite ? 0.85 : isGold ? 0.9 : 1
  const discountPercent = isBlack || isElite ? 15 : isGold ? 10 : 0

  const [activeImage, setActiveImage] = useState(product.thumbnail)
  const [selectedColorName, setSelectedColorName] = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const [mode, setMode] = useState<"rollo" | "kilo">("rollo")
  const [quantity, setQuantity] = useState(1)
  const [showAllColors, setShowAllColors] = useState(false)
  const [added, setAdded] = useState(false)

  const isMeter = product.unit === "Metro"
  const unitLabel = isMeter ? "Metro" : "Kilo"
  const unitAbbr = isMeter ? "MT" : "KG"
  const unitsPerRoll = product.unidadesPorRollo || 25
  const basePrice = mode === "rollo" ? (product.prices?.mayoreo || 0) : (product.prices?.menudeo || 0)
  const currentPrice = basePrice * discountMultiplier
  const unitFactor = mode === "rollo" ? unitsPerRoll : 1
  const currentUnits = quantity * unitFactor
  const totalPay = currentUnits * currentPrice
  const totalMeters = !isMeter ? (currentUnits * (product.rendimiento || 4.3)).toFixed(1) : currentUnits

  const handleColorClick = (e: React.MouseEvent, color: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (color.image) setActiveImage(color.image)
    setSelectedColorName(color.name)
  }

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      ...product,
      image: activeImage ?? product.thumbnail ?? "/placeholder.jpg",
      price: currentPrice,
      quantity: currentUnits,
      unit: mode === "rollo" ? `${unitAbbr} (Rollo)` : unitLabel,
      variantId: mode,
      color: selectedColorName,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        w-full bg-[#0a0a0a] border border-white/10 
        hover:border-[#FDCB02]/60 
        hover:shadow-[0_0_40px_rgba(253,203,2,0.12)]
        transition-all duration-500 relative flex flex-col 
        group overflow-hidden rounded-xl
        ${className}
      `}
    >
      {hasDiscount && (
        <div className={`absolute top-3 right-3 z-20 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-lg flex items-center gap-1
          ${isElite ? "bg-[#FDCB02] text-black ring-1 ring-[#FDCB02]/50" : isBlack ? "bg-white text-black" : "bg-[#FDCB02] text-black"}
        `}>
          <Star size={9} fill="currentColor" /> {tier} -{discountPercent}%
        </div>
      )}

      {/* Image area */}
      <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] w-full overflow-hidden cursor-pointer">
        <Image
          src={activeImage || "/placeholder.jpg"}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className={`object-cover transition-transform duration-700 ${hovered ? "scale-110" : "scale-100"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85" />

        {/* Product info overlay */}
        <div className="absolute bottom-0 left-0 w-full px-4 pb-4 pt-8 bg-gradient-to-t from-black/90 to-transparent">
          <h3 className="text-xl font-[1000] uppercase text-white leading-none tracking-tight">{product.title}</h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] font-black text-[#FDCB02] tracking-widest uppercase">
              {product.composicion || "100% Poliéster"}
            </span>
            <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] text-neutral-400 font-bold uppercase">GSM</span>
              <span className="text-base font-black text-white">{product.gramaje || "145"}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 flex flex-col gap-4 bg-[#080808]">

        {/* Mode toggle */}
        <div className="grid grid-cols-2 bg-[#111] p-0.5 rounded-lg border border-white/8">
          <button
            onClick={(e) => { e.preventDefault(); setMode("rollo"); setQuantity(1) }}
            className={`text-[10px] font-[900] uppercase py-1.5 rounded transition-all ${
              mode === "rollo" ? "bg-[#FDCB02] text-black shadow" : "text-neutral-500 hover:text-white"
            }`}
          >
            Por Rollo
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setMode("kilo"); setQuantity(1) }}
            className={`text-[10px] font-[900] uppercase py-1.5 rounded transition-all ${
              mode === "kilo" ? "bg-white text-black shadow" : "text-neutral-500 hover:text-white"
            }`}
          >
            Por {unitLabel}
          </button>
        </div>

        {/* Price + units */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[9px] font-bold text-neutral-600 uppercase mb-0.5">
              Precio s/IVA {hasDiscount && <span className="text-[#FDCB02]">(-{discountPercent}%)</span>}
            </p>
            {hasDiscount && (
              <p className="text-[10px] text-neutral-600 line-through font-bold leading-none mb-0.5">${basePrice.toFixed(0)}</p>
            )}
            <p className={`text-3xl font-[1000] tracking-tighter leading-none ${hasDiscount ? "text-[#FDCB02]" : "text-white"}`}>
              ${currentPrice.toFixed(0)}
              <span className={`text-xs font-bold align-top ml-0.5 ${hasDiscount ? "text-yellow-600" : "text-neutral-500"}`}>.00</span>
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#FDCB02] justify-end">
              {isMeter ? <Ruler size={13} /> : <Weight size={13} />}
              <span className="text-sm font-[900]">{currentUnits} {unitAbbr}</span>
            </div>
            {!isMeter && (
              <div className="flex items-center gap-1 text-neutral-500 justify-end mt-0.5">
                <Ruler size={11} />
                <span className="text-[10px] font-mono">{totalMeters} MT</span>
              </div>
            )}
          </div>
        </div>

        {/* Color selector */}
        {product.colors && product.colors.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">Color</span>
              <span className="text-[9px] font-bold text-[#FDCB02] uppercase tracking-widest">{selectedColorName || "Elegir"}</span>
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              {product.colors.slice(0, 6).map((c: any, i: number) => (
                <button
                  key={i}
                  onClick={(e) => handleColorClick(e, c)}
                  className={`w-7 h-7 rounded-full border shrink-0 transition-all relative ${
                    selectedColorName === c.name
                      ? "border-white ring-2 ring-[#FDCB02] ring-offset-1 ring-offset-black scale-110"
                      : "border-white/10 hover:border-white/40"
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                >
                  {selectedColorName === c.name && (
                    <Check
                      size={11}
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                        ["Blanco", "Beige", "Hueso", "Amarillo"].includes(c.name) ? "text-black" : "text-white"
                      }`}
                    />
                  )}
                </button>
              ))}
              {product.colors.length > 6 && (
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAllColors(true) }}
                  className="w-7 h-7 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-bold text-white hover:border-[#FDCB02]/60 transition-all"
                >
                  +{product.colors.length - 6}
                </button>
              )}
            </div>

            {/* Color modal */}
            <AnimatePresence>
              {showAllColors && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                  onClick={() => setShowAllColors(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-5 border-b border-white/10 flex items-center justify-between">
                      <h4 className="text-base font-bold text-white uppercase tracking-wide">{product.title} — Colores</h4>
                      <button onClick={() => setShowAllColors(false)} className="text-neutral-400 hover:text-white text-xl leading-none">✕</button>
                    </div>
                    <div className="p-5 overflow-y-auto max-h-[65vh]">
                      <div className="grid grid-cols-5 gap-4">
                        {product.colors.map((c: any, i: number) => (
                          <button
                            key={i}
                            onClick={(e) => { handleColorClick(e, c); setShowAllColors(false) }}
                            className="flex flex-col items-center gap-1.5 group/c"
                          >
                            <div
                              className={`w-12 h-12 rounded-xl border-2 transition-all relative ${
                                selectedColorName === c.name
                                  ? "border-[#FDCB02] ring-2 ring-[#FDCB02]/40 scale-110"
                                  : "border-white/10 hover:border-white/30"
                              }`}
                              style={{ backgroundColor: c.hex }}
                            >
                              {selectedColorName === c.name && (
                                <Check
                                  size={16}
                                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                                    c.name.includes("Blanco") || c.name.includes("Beige") || c.name.includes("Hueso")
                                      ? "text-black"
                                      : "text-white"
                                  }`}
                                />
                              )}
                            </div>
                            <span className="text-[9px] text-center text-neutral-500 group-hover/c:text-white transition-colors leading-tight max-w-[52px] truncate">
                              {c.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 border-t border-white/10 text-center">
                      <button onClick={() => setShowAllColors(false)} className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white">Cerrar</button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Quantity + CTA */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between bg-[#111] border border-white/10 h-9 rounded px-1">
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)) }}
              className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"
            >
              <Minus size={13} />
            </button>
            <span className="text-[11px] font-bold text-white uppercase tracking-wide">
              {quantity} {mode === "rollo" ? "Rollos" : `${unitLabel}s`}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1) }}
              className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          <button
            onClick={handleAdd}
            className={`w-full h-11 font-[900] uppercase tracking-widest text-[11px] flex items-center justify-between px-5 rounded transition-all duration-300 group/btn ${
              added
                ? "bg-green-500 text-white"
                : hasDiscount
                ? "bg-[#FDCB02] text-black hover:bg-white"
                : "bg-white text-black hover:bg-[#FDCB02]"
            }`}
          >
            <span>{added ? "¡Agregado!" : `Agregar • ${formatMoney(totalPay)}`}</span>
            {added
              ? <Check size={15} />
              : <ArrowRight size={15} className="group-hover/btn:-rotate-45 transition-transform duration-300" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// PRODUCT RAIL
// ─────────────────────────────────────────────
const ProductRail = ({
  id, title, items, icon: Icon, isNational = false, titleAlign = "left",
}: {
  id: string; title: string; items: any[]; icon?: any; isNational?: boolean; titleAlign?: "left" | "right"
}) => {
  if (!items || items.length === 0) return null
  const isRight = titleAlign === "right"

  return (
    <section id={id} className="mb-20 border-b border-white/5 pb-10 scroll-mt-[140px]">
      <div className={`flex items-end mb-8 px-1 ${isRight ? "justify-end" : "justify-start"}`}>
        <div className={`flex items-center gap-4 ${isRight ? "flex-row-reverse" : ""}`}>
          {Icon && (
            <div className={`p-3 rounded border ${isNational ? "bg-green-900/20 border-green-500/30 text-green-500" : "bg-[#FDCB02]/10 border-[#FDCB02]/30 text-[#FDCB02]"}`}>
              <Icon size={22} strokeWidth={1.5} />
            </div>
          )}
          <div className={isRight ? "text-right" : ""}>
            <h3 className="text-3xl md:text-5xl font-[1000] uppercase text-white italic tracking-tighter leading-none">{title}</h3>
            {isNational && (
              <p className={`text-xs text-green-500/80 font-mono mt-2 uppercase tracking-widest flex items-center gap-2 ${isRight ? "justify-end" : ""}`}>
                <Flag size={10} /> Apoya la industria local • Envío Inmediato
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {items.map((product, i) => (
          <ProductCard key={product.id || i} product={product} className="!w-full !min-w-0" />
        ))}
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="py-32 flex flex-col items-center gap-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[#111] border border-white/10 flex items-center justify-center">
        <Search size={24} className="text-neutral-700" />
      </div>
      <div>
        <p className="text-white font-[900] uppercase tracking-widest text-sm mb-2">Sin resultados</p>
        <p className="text-neutral-600 text-xs max-w-xs">No encontramos telas que coincidan con tus filtros.</p>
      </div>
      <button
        onClick={onClear}
        className="bg-[#FDCB02] text-black font-[900] uppercase tracking-widest text-xs px-8 py-3 rounded hover:bg-white transition-colors"
      >
        Limpiar filtros
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// STICKY BOTTOM BAR — SIMULADOR DE CARGA
// ─────────────────────────────────────────────
function ContainerBar() {
  const { items } = useCart()

  const totalKg = items.reduce((acc, item) => acc + (item.quantity || 0), 0)
  const MAX_CONTAINER = 20000
  const pct = Math.min(Math.round((totalKg / MAX_CONTAINER) * 100), 100)
  const remaining = Math.max(MAX_CONTAINER - totalKg, 0)

  if (items.length === 0) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-[80] bg-[#080808]/98 backdrop-blur-xl border-t border-white/10 shadow-[0_-8px_40px_rgba(0,0,0,0.8)]"
    >
      <div className="max-w-[1920px] mx-auto px-4 md:px-8 py-3 flex items-center gap-4 md:gap-8">

        {/* Truck icon + label */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Truck size={28} className="text-white" strokeWidth={1.5} />
            {pct >= 100 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FDCB02] rounded-full animate-ping" />
            )}
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">Simulador de Carga</span>
            <span className="text-[11px] font-black text-white uppercase">{pct}% llenado</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-[#FDCB02] rounded-full shadow-[0_0_10px_rgba(253,203,2,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-neutral-600 hidden md:block">
              {pct < 100
                ? `Añade ${remaining.toLocaleString("es-MX")} kg más para optimizar logística`
                : "✓ Contenedor listo para despacho"}
            </span>
            <span className="text-[9px] font-mono text-[#FDCB02] font-bold ml-auto">
              {totalKg.toLocaleString("es-MX")} / {MAX_CONTAINER.toLocaleString("es-MX")} KG
            </span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/contenedor"
          className="shrink-0 h-10 px-5 md:px-8 bg-[#FDCB02] text-black font-[900] uppercase text-[10px] tracking-widest rounded flex items-center gap-2 hover:bg-white transition-all shadow-[0_0_20px_rgba(253,203,2,0.25)] whitespace-nowrap"
        >
          Programar Despacho
          <ChevronRight size={13} />
        </Link>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────
// PÁGINA PRINCIPAL
// ─────────────────────────────────────────────
export default function CoyoteMarketplace() {
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    categories: new Set(),
    gsmRange: null,
    sort: "relevance",
  })

  useEffect(() => {
    const lenis = new Lenis({ duration: 1.2, lerp: 0.1 })
    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  const telasPrincipales = products.filter((p) => p.category !== "Hilos")
  const byCategory = (cat: string) => telasPrincipales.filter((p: any) => p.category === cat)
  const filteredProducts = useFilteredProducts(telasPrincipales, filters)

  const isFiltering =
    filters.query.length > 0 ||
    filters.categories.size > 0 ||
    filters.gsmRange !== null ||
    filters.sort !== "relevance"

  const categorySections = [
    { id: "licras",          title: "Licras",           items: byCategory("Deportivo / Licra"),       icon: Package },
    { id: "telas-escolares", title: "Telas Escolares",  items: byCategory("Escolar / Deportivo"),     icon: Package },
    { id: "telas-invierno",  title: "Línea Invernal",   items: byCategory("Línea Invernal"),          icon: Package },
    { id: "telas-tecnicas",  title: "Telas Técnicas",   items: byCategory("Telas Técnicas"),          icon: Package },
  ]

  function clearFilters() {
    setFilters({ query: "", categories: new Set(), gsmRange: null, sort: "relevance" })
  }

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-32 relative overflow-x-hidden">
      <IntroLoader />

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035] mix-blend-overlay z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ──────────────────────────────────────
          HERO — Centrado con blob 3D de tela
      ────────────────────────────────────── */}
      <section className="relative h-[82vh] md:h-[88vh] min-h-[580px] flex items-center justify-center bg-[#050505] overflow-hidden border-b border-white/5">

        {/* Background: imagen hero como base */}
        <Image
          src="/hero1.png"
          alt="Coyote Textil"
          fill
          className="object-cover opacity-50"
          priority
        />

        {/* Gradient overlay radial — oscurece bordes y centra la luz */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_55%_50%,rgba(0,0,0,0.1)_0%,rgba(0,0,0,0.85)_100%)] z-10" />
        {/* Gradiente lateral para separar del navbar */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/50 z-10" />

        {/* Blob animado de luz — simula el glow del objeto 3D */}
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute z-10 w-[500px] h-[400px] rounded-full bg-[#FDCB02]/10 blur-[100px] pointer-events-none"
          style={{ top: "50%", left: "55%", transform: "translate(-50%, -50%)" }}
        />

        {/* Contenido centrado */}
        <div className="relative z-20 flex flex-col items-center justify-center text-center px-6 max-w-5xl mx-auto w-full">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-flex items-center gap-3 border-l-4 border-[#FDCB02] pl-5 mb-8 uppercase text-[10px] font-[900] tracking-[0.35em] text-[#FDCB02]"
          >
            Infraestructura Nacional
          </motion.div>

          {/* Headline principal */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center leading-[0.82] mb-8"
          >
            <h1 className="text-[clamp(3rem,9vw,7.5rem)] font-[1000] uppercase text-white tracking-tighter drop-shadow-2xl">
              VISTIENDO LA FUERZA
            </h1>
            <h1 className="text-[clamp(3.2rem,10vw,8.5rem)] font-[1000] uppercase text-[#FDCB02] tracking-tighter drop-shadow-2xl">
              DE MÉXICO
            </h1>
          </motion.div>

          {/* Subtítulo */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-base md:text-xl text-white/70 font-[700] uppercase italic tracking-tight max-w-2xl mb-10"
          >
            Control Absoluto del Suministro. Sin Rivales. Sin Excusas.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link
              href="/contenedor"
              className="w-full sm:w-auto h-14 px-10 border-2 border-white/30 bg-black/50 backdrop-blur-md text-white font-[900] uppercase text-[11px] tracking-[0.2em] rounded flex items-center justify-center hover:bg-white hover:text-black hover:border-white transition-all duration-400"
            >
              Cotizar Contenedor
            </Link>
            <button
              onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full sm:w-auto h-14 px-10 bg-[#FDCB02] text-black font-[900] uppercase text-[11px] tracking-[0.2em] rounded flex items-center justify-center gap-2 hover:bg-white hover:shadow-[0_0_40px_rgba(253,203,2,0.35)] transition-all duration-400"
            >
              Ver Stock
              <ChevronRight size={15} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Filter bar */}
      <FilterBar
        categories={CATEGORY_LABELS}
        totalCount={telasPrincipales.length}
        filteredCount={filteredProducts.length}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* ── MAIN CONTENT ── */}
      <main id="catalogo" className="container mx-auto px-4 md:px-6 py-12 md:py-20 relative z-10">
        {isFiltering ? (
          <section className="animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-10">
              <h3 className="text-3xl font-[1000] uppercase text-white italic tracking-tighter">Resultados</h3>
              <span className="text-xs font-mono text-neutral-500 border border-white/10 px-3 py-1 rounded bg-[#0a0a0a]">
                {filteredProducts.length} referencias
              </span>
              {filters.sort !== "relevance" && (
                <span className="text-[10px] font-bold text-[#FDCB02] uppercase tracking-widest border border-[#FDCB02]/20 px-2 py-1 rounded">
                  {{ price_asc: "Precio ↑", price_desc: "Precio ↓", gsm: "Por gramaje", relevance: "" }[filters.sort]}
                </span>
              )}
            </div>
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} className="!w-full !min-w-0" />
                ))}
              </div>
            ) : (
              <EmptyState onClear={clearFilters} />
            )}
          </section>
        ) : (
          <div className="space-y-24 animate-in fade-in duration-700">

            {/* Primera sección destacada */}
            <ProductRail
              id="telas-para-sublimar"
              title="Potencia en cada fibra"
              items={byCategory("Deportivas / Sublimación")}
              icon={BicepsFlexed}
              titleAlign="left"
            />

            {categorySections.map((cat) => (
              <ProductRail
                key={cat.id}
                id={cat.id}
                title={cat.title}
                items={cat.items}
                icon={cat.icon}
                titleAlign="right"
              />
            ))}

            {/* Banner UV */}
            <div className="w-full relative rounded-xl overflow-hidden border border-white/10 flex flex-col md:flex-row items-start md:items-center px-6 md:px-12 py-8 md:py-0 md:h-40 bg-[#0d0d0d] gap-6">
              <div className="absolute inset-0 opacity-5 mix-blend-overlay"
                style={{ backgroundImage: "url('https://grainy-gradients.vercel.app/noise.svg')" }} />
              <div className="relative z-10 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-[#FDCB02]">
                  <Sun size={16} />
                  <span className="text-[11px] font-black uppercase tracking-widest">Tecnología UV-Shield</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-[900] uppercase text-white italic tracking-tighter">
                  Protección Solar Certificada
                </h3>
                <p className="text-xs text-neutral-500 font-mono">Disponible en Piqué y Microfibra para uniformes escolares.</p>
              </div>
              <button className="md:ml-auto shrink-0 bg-white hover:bg-[#FDCB02] text-black px-8 py-3.5 text-[11px] font-[900] uppercase tracking-widest transition-colors rounded">
                Ver Colección
              </button>
            </div>

          </div>
        )}
      </main>

      {/* Sticky container simulator */}
      <ContainerBar />
    </div>
  )
}