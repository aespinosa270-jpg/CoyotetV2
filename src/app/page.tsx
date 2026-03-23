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
  { label: "< 120 gsm",  fn: (g: number) => g < 120 },
  { label: "120–150",    fn: (g: number) => g >= 120 && g <= 150 },
  { label: "151–200",    fn: (g: number) => g > 150 && g <= 200 },
  { label: "> 200 gsm",  fn: (g: number) => g > 200 },
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

function FilterBar({
  categories,
  totalCount,
  filteredCount,
  filters,
  onFilterChange,
}: FilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const active =
    filters.categories.size > 0 ||
    filters.gsmRange !== null ||
    filters.query.length > 0

  const activeCount =
    filters.categories.size + (filters.gsmRange !== null ? 1 : 0)

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
    onFilterChange({
      query: "",
      categories: new Set(),
      gsmRange: null,
      sort: "relevance",
    })
    setExpanded(false)
  }

  const chip = (active: boolean) =>
    `shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-[900] uppercase tracking-wider transition-all cursor-pointer ${
      active
        ? "bg-[#FDCB02] border-[#FDCB02] text-black"
        : "border-white/10 text-neutral-500 hover:border-white/30 hover:text-white"
    }`

  return (
    <div className="sticky top-[168px] z-[90] w-full bg-[#070707]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      {/* BARRA PRINCIPAL */}
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

        {/* Category chips — scroll horizontal */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide min-w-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={chip(filters.categories.has(cat))}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 shrink-0 ml-auto">
          {/* Counter */}
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

          {/* Filtros toggle */}
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
              <span className="bg-black/20 rounded-full px-1.5 py-0.5 text-[9px] font-black">
                {activeCount}
              </span>
            )}
          </button>

          {/* Sort */}
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

      {/* PANEL EXPANDIDO */}
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
                <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">
                  Gramaje (gsm)
                </p>
                <div className="flex flex-wrap gap-2">
                  {GSM_RANGES.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => toggleGsm(i)}
                      className={chip(filters.gsmRange === i)}
                    >
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
      result = result.filter((p) =>
        GSM_RANGES[filters.gsmRange!].fn(Number(p.gramaje))
      )
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
const ProductCard = ({
  product,
  className = "",
}: {
  product: any
  className?: string
}) => {
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

  const isMeter = product.unit === "Metro"
  const unitLabel = isMeter ? "Metro" : "Kilo"
  const unitAbbr = isMeter ? "MT" : "KG"
  const unitsPerRoll = product.unidadesPorRollo || 25
  const basePrice = mode === "rollo" ? product.prices?.mayoreo : product.prices?.menudeo
  const currentPrice = basePrice * discountMultiplier
  const unitFactor = mode === "rollo" ? unitsPerRoll : 1
  const currentUnits = quantity * unitFactor
  const totalPay = currentUnits * currentPrice
  const totalMeters = !isMeter
    ? (currentUnits * (product.rendimiento || 4.3)).toFixed(1)
    : currentUnits

  const handleColorClick = (e: any, color: any) => {
    e.preventDefault()
    e.stopPropagation()
    if (color.image) setActiveImage(color.image)
    setSelectedColorName(color.name)
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`min-w-[320px] w-[320px] bg-[#050505] border border-white/10 hover:border-[#FDCB02]/50 transition-all duration-300 relative flex flex-col snap-center md:snap-align-none group overflow-hidden rounded-xl shadow-2xl ${className}`}
    >
      {hasDiscount && (
        <div className="absolute top-4 right-4 z-20 bg-[#FDCB02] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded shadow-lg flex items-center gap-1">
          <Star size={10} fill="currentColor" /> TARIFA {tier}
        </div>
      )}

      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-[4/3] w-full overflow-hidden border-b border-white/5 cursor-pointer"
      >
        <Image
          src={activeImage || "/placeholder.jpg"}
          alt={product.title}
          fill
          className={`object-cover transition-transform duration-700 ${hovered ? "scale-110" : "scale-100"}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
        <div className="absolute bottom-0 left-0 w-full p-5">
          <h3 className="text-2xl font-[1000] uppercase text-white leading-none tracking-tight mb-1">
            {product.title}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-[#FDCB02] tracking-widest uppercase">
              {product.composicion || "100% Poliéster"}
            </span>
            <div className="flex flex-col items-end leading-none">
              <span className="text-[9px] text-neutral-400 font-bold uppercase">GSM</span>
              <span className="text-lg font-black text-white">{product.gramaje || "145"}</span>
            </div>
          </div>
        </div>
      </Link>

      <div className="p-5 flex flex-col gap-5 bg-[#050505]">
        {/* Modo rollo / kilo */}
        <div className="grid grid-cols-2 bg-[#111] p-1 rounded-lg border border-white/10">
          <button
            onClick={(e) => { e.preventDefault(); setMode("rollo"); setQuantity(1) }}
            className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${
              mode === "rollo" ? "bg-[#FDCB02] text-black shadow-lg" : "text-neutral-500 hover:text-white"
            }`}
          >
            Por Rollo
          </button>
          <button
            onClick={(e) => { e.preventDefault(); setMode("kilo"); setQuantity(1) }}
            className={`text-[10px] font-[900] uppercase py-2 rounded transition-all ${
              mode === "kilo" ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white"
            }`}
          >
            Por {unitLabel}
          </button>
        </div>

        {/* Precio */}
        <div className="flex justify-between items-end border-b border-white/5 pb-4">
          <div>
            <p className="text-[9px] font-bold text-neutral-500 uppercase mb-0.5">
              Precio Sin Iva{" "}
              {hasDiscount && (
                <span className="text-[#FDCB02]">(-{discountPercent}%)</span>
              )}
            </p>
            {hasDiscount && (
              <p className="text-[11px] text-neutral-500 line-through font-bold mb-0.5 leading-none">
                ${basePrice?.toFixed(2)}
              </p>
            )}
            <p
              className={`text-4xl font-[1000] tracking-tighter ${
                hasDiscount
                  ? "text-[#FDCB02] drop-shadow-[0_0_10px_rgba(253,203,2,0.3)]"
                  : "text-white"
              }`}
            >
              ${currentPrice?.toFixed(0) || "0"}
              <span
                className={`text-sm font-bold align-top ${
                  hasDiscount ? "text-yellow-600" : "text-neutral-500"
                }`}
              >
                .00
              </span>
            </p>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5 text-[#FDCB02]">
              {isMeter ? (
                <Ruler size={14} strokeWidth={2.5} />
              ) : (
                <Weight size={14} strokeWidth={2.5} />
              )}
              <span className="text-sm font-[900]">
                {currentUnits} {unitAbbr}
              </span>
            </div>
            {!isMeter && (
              <div className="flex items-center gap-1.5 text-neutral-400">
                <Ruler size={12} />
                <span className="text-[10px] font-mono font-bold">{totalMeters} MT</span>
              </div>
            )}
          </div>
        </div>

        {/* Colores */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[9px] font-bold text-neutral-500 uppercase tracking-widest">
              Colorido
            </span>
            <span className="text-[9px] font-bold text-[#FDCB02] uppercase tracking-widest">
              {selectedColorName || "Seleccionar"}
            </span>
          </div>

          {product.colors && (
            <>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {product.colors.slice(0, 6).map((c: any, i: number) => (
                  <button
                    key={i}
                    onClick={(e) => handleColorClick(e, c)}
                    className={`w-8 h-8 rounded-full border shrink-0 transition-all relative ${
                      selectedColorName === c.name
                        ? "border-white ring-2 ring-[#FDCB02] ring-offset-2 ring-offset-black scale-110"
                        : "border-white/10 hover:border-white"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColorName === c.name && (
                      <Check
                        size={12}
                        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                          ["Blanco", "Beige", "Hueso"].includes(c.name)
                            ? "text-black"
                            : "text-white"
                        }`}
                      />
                    )}
                  </button>
                ))}

                {product.colors.length > 6 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowAllColors(true)
                    }}
                    className="w-8 h-8 rounded-full bg-[#111] border border-white/10 flex items-center justify-center text-[9px] font-bold text-white hover:border-[#FDCB02] hover:text-[#FDCB02] active:scale-95 transition-all"
                  >
                    +{product.colors.length - 6}
                  </button>
                )}
              </div>

              {/* Modal colores */}
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
                        <h4 className="text-lg font-bold text-white">
                          Todos los colores disponibles
                        </h4>
                        <button
                          onClick={() => setShowAllColors(false)}
                          className="text-neutral-400 hover:text-white text-2xl leading-none"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="p-6 overflow-y-auto max-h-[65vh]">
                        <div className="grid grid-cols-5 gap-4">
                          {product.colors.map((c: any, i: number) => (
                            <button
                              key={i}
                              onClick={(e) => {
                                handleColorClick(e, c)
                                setShowAllColors(false)
                              }}
                              className="group flex flex-col items-center gap-1.5"
                            >
                              <div
                                className={`w-14 h-14 rounded-2xl border-2 transition-all relative ${
                                  selectedColorName === c.name
                                    ? "border-[#FDCB02] ring-2 ring-[#FDCB02]/50 scale-110"
                                    : "border-white/10 hover:border-white/40"
                                }`}
                                style={{ backgroundColor: c.hex }}
                              >
                                {selectedColorName === c.name && (
                                  <Check
                                    size={18}
                                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${
                                      c.name.includes("Blanco") ||
                                      c.name.includes("Beige") ||
                                      c.name.includes("Hueso")
                                        ? "text-black"
                                        : "text-white"
                                    }`}
                                  />
                                )}
                              </div>
                              <span className="text-[10px] text-center text-neutral-400 group-hover:text-white transition-colors leading-tight max-w-[60px] truncate">
                                {c.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 border-t border-white/10 text-center">
                        <button
                          onClick={() => setShowAllColors(false)}
                          className="text-xs uppercase tracking-widest text-neutral-500 hover:text-white"
                        >
                          Cerrar
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Cantidad + CTA */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between bg-[#111] border border-white/10 h-10 rounded px-1">
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(Math.max(1, quantity - 1)) }}
              className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-bold text-white uppercase">
              {quantity} {mode === "rollo" ? "Rollos" : `${unitLabel}s`}
            </span>
            <button
              onClick={(e) => { e.preventDefault(); setQuantity(quantity + 1) }}
              className="w-8 h-full flex items-center justify-center text-white hover:text-[#FDCB02] transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={(e) => {
              e.preventDefault()
              addItem({
                ...product,
                price: currentPrice,
                quantity: currentUnits,
                unit: mode === "rollo" ? `${unitLabel} (Rollo)` : unitLabel,
                variantId: mode,
                color: selectedColorName,
              })
            }}
            className={`w-full h-12 font-[900] uppercase tracking-widest text-xs flex items-center justify-between px-6 rounded transition-all duration-300 group/btn ${
              hasDiscount
                ? "bg-[#FDCB02] text-black hover:bg-white"
                : "bg-white hover:bg-[#FDCB02] text-black"
            }`}
          >
            <span>Agregar • {formatMoney(totalPay)}</span>
            <ArrowRight
              size={16}
              className="group-hover/btn:-rotate-45 transition-transform duration-300"
            />
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
  id,
  title,
  items,
  icon: Icon,
  isNational = false,
  titleAlign = "left",
}: {
  id: string
  title: string
  items: any[]
  icon?: any
  isNational?: boolean
  titleAlign?: "left" | "right"
}) => {
  if (!items || items.length === 0) return null
  const isRight = titleAlign === "right"

  return (
    <section
      id={id}
      className="mb-20 border-b border-white/5 pb-10 scroll-mt-[200px]"
    >
      <div
        className={`flex items-end mb-8 px-1 ${isRight ? "justify-end" : "justify-start"}`}
      >
        <div className={`flex items-center gap-4 ${isRight ? "flex-row-reverse" : ""}`}>
          {Icon && (
            <div
              className={`p-3 rounded border ${
                isNational
                  ? "bg-green-900/20 border-green-500/30 text-green-500"
                  : "bg-[#FDCB02]/10 border-[#FDCB02]/30 text-[#FDCB02]"
              }`}
            >
              <Icon size={24} strokeWidth={1.5} />
            </div>
          )}
          <div className={isRight ? "text-right" : ""}>
            <h3 className="text-3xl md:text-5xl font-[1000] uppercase text-white italic tracking-tighter leading-none">
              {title}
            </h3>
            {isNational && (
              <p
                className={`text-xs text-green-500/80 font-mono mt-2 uppercase tracking-widest flex items-center gap-2 ${
                  isRight ? "justify-end" : ""
                }`}
              >
                <Flag size={10} /> Apoya la industria local • Envío Inmediato
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {items.map((product, i) => (
          <ProductCard
            key={product.id || i}
            product={product}
            className="!w-full !min-w-0"
          />
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
        <p className="text-white font-[900] uppercase tracking-widest text-sm mb-2">
          Sin resultados
        </p>
        <p className="text-neutral-600 text-xs max-w-xs">
          No encontramos telas que coincidan con tus filtros. Prueba con otra
          combinación.
        </p>
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
    function raf(time: any) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
    return () => lenis.destroy()
  }, [])

  // Solo telas (sin hilos)
  const telasPrincipales = products.filter((p) => p.category !== "Hilos")

  const byCategory = (cat: string) =>
    telasPrincipales.filter((p: any) => p.category === cat)

  const filteredProducts = useFilteredProducts(telasPrincipales, filters)

  const isFiltering =
    filters.query.length > 0 ||
    filters.categories.size > 0 ||
    filters.gsmRange !== null ||
    filters.sort !== "relevance"

  const categorySections = [
    {
      id: "telas-para-sublimar",
      title: "Telas para Sublimar",
      items: byCategory("Deportivas / Sublimación"),
      icon: Zap,
    },
    {
      id: "licras",
      title: "Licras",
      items: byCategory("Deportivo / Licra"),
      icon: Package,
    },
    {
      id: "telas-escolares",
      title: "Telas Escolares",
      items: byCategory("Escolar / Deportivo"),
      icon: Package,
    },
    {
      id: "telas-invierno",
      title: "Línea Invernal",
      items: byCategory("Línea Invernal"),
      icon: Package,
    },
    {
      id: "telas-tecnicas",
      title: "Telas Técnicas",
      items: byCategory("Telas Técnicas"),
      icon: Package,
    },
  ]

  function clearFilters() {
    setFilters({
      query: "",
      categories: new Set(),
      gsmRange: null,
      sort: "relevance",
    })
  }

  return (
    <div className="bg-[#030303] min-h-screen text-white font-sans selection:bg-[#FDCB02] selection:text-black pb-20 relative overflow-x-hidden">
      <IntroLoader />

      {/* Grain overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── HERO ── */}
      <div className="relative h-[80vh] md:h-[85vh] flex items-center bg-[#050505] border-b border-white/10 overflow-hidden">
        <Image
          src="/hero1.png"
          alt="Coyote Industrial"
          fill
          className="object-cover opacity-60"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 md:via-black/70 to-transparent z-10" />
        <div className="container mx-auto px-4 md:px-6 relative z-20 pt-16 md:pt-20">
          <div className="inline-flex items-center gap-3 border-l-4 border-[#FDCB02] pl-4 md:pl-6 mb-6 md:mb-8 uppercase text-[10px] md:text-xs font-[900] tracking-[0.3em] text-[#FDCB02]">
            Infraestructura Nacional
          </div>
          <div className="flex flex-col mb-8 md:mb-10 leading-[0.85]">
            <h1 className="text-5xl sm:text-6xl md:text-[8vw] font-[1000] uppercase text-white tracking-tighter drop-shadow-2xl">
              VISTIENDO LA FUERZA
            </h1>
            <h1 className="text-5xl sm:text-6xl md:text-[9vw] font-[1000] uppercase text-[#FDCB02] tracking-tighter drop-shadow-2xl">
              DE MÉXICO
            </h1>
          </div>
          <p className="text-lg md:text-3xl text-white font-[900] max-w-xl md:max-w-3xl mb-8 md:mb-12 uppercase italic tracking-tight opacity-90">
            Control absoluto del suministro. Sin rivales. Sin excusas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
            <Link
              href="/contenedor"
              className="bg-[#FDCB02] text-black h-14 md:h-16 px-12 flex items-center justify-center font-[900] uppercase text-xs md:text-sm tracking-widest rounded hover:bg-white transition-colors"
            >
              Cotizar Contenedor
            </Link>
            <button className="h-14 md:h-16 px-12 border border-white/20 bg-black/50 backdrop-blur text-white flex items-center justify-center font-[900] uppercase text-xs md:text-sm tracking-widest rounded hover:bg-white hover:text-black transition-colors">
              Ver Stock
            </button>
          </div>
        </div>
      </div>

      {/* ── FILTER BAR — sticky bajo el navbar ── */}
      <FilterBar
        categories={CATEGORY_LABELS}
        totalCount={telasPrincipales.length}
        filteredCount={filteredProducts.length}
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* ── MAIN CONTENT ── */}
      <main className="container mx-auto px-4 md:px-6 py-10 md:py-16 relative z-10">
        {isFiltering ? (
          /* ── VISTA FILTRADA: grid flat, sin secciones ── */
          <section className="animate-in fade-in duration-300">
            <div className="flex items-center gap-4 mb-8">
              <h3 className="text-3xl font-[1000] uppercase text-white italic tracking-tighter">
                Resultados
              </h3>
              <span className="text-xs font-mono text-neutral-500 border border-white/10 px-3 py-1 rounded bg-[#0a0a0a]">
                {filteredProducts.length} referencias
              </span>
              {filters.sort !== "relevance" && (
                <span className="text-[10px] font-bold text-[#FDCB02] uppercase tracking-widest border border-[#FDCB02]/20 px-2 py-1 rounded">
                  {{
                    price_asc: "Precio ↑",
                    price_desc: "Precio ↓",
                    gsm: "Por gramaje",
                    relevance: "",
                  }[filters.sort]}
                </span>
              )}
            </div>

            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    className="!w-full !min-w-0"
                  />
                ))}
              </div>
            ) : (
              <EmptyState onClear={clearFilters} />
            )}
          </section>
        ) : (
          /* ── VISTA DEFAULT: secciones por categoría ── */
          <div className="space-y-24 animate-in fade-in duration-700">
            <ProductRail
              id="telas-deportivas"
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
            <div className="w-full h-auto py-8 md:h-40 relative rounded overflow-hidden group border border-white/10 flex flex-col md:flex-row items-start md:items-center px-6 md:px-12 bg-[#111] gap-6">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
              <div className="relative z-10 flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 text-[#FDCB02] mb-1">
                  <Sun size={18} />
                  <span className="text-[11px] font-black uppercase tracking-widest">
                    Tecnología UV-Shield
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-[900] uppercase text-white italic tracking-tighter">
                  Protección Solar Certificada
                </h3>
                <p className="text-xs md:text-sm text-neutral-400 font-mono mt-1">
                  Disponible en Piqué y Microfibra para uniformes escolares.
                </p>
              </div>
              <button className="md:ml-auto w-full md:w-auto bg-white hover:bg-[#FDCB02] text-black px-8 py-3 md:py-4 text-[10px] md:text-[11px] font-[900] uppercase tracking-widest transition-colors rounded">
                Ver Colección
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}