"use client"
import { useState, useMemo } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"

export type FilterState = {
  query: string
  categories: Set<string>
  gsmRange: number | null   // índice del rango, null = todos
  sort: "relevance" | "price_asc" | "price_desc" | "gsm"
}

const GSM_RANGES = [
  { label: "< 120", fn: (g: number) => g < 120 },
  { label: "120–150", fn: (g: number) => g >= 120 && g <= 150 },
  { label: "151–200", fn: (g: number) => g > 150 && g <= 200 },
  { label: "> 200", fn: (g: number) => g > 200 },
]

interface FilterBarProps {
  categories: string[]
  totalCount: number
  filteredCount: number
  onFilterChange: (f: FilterState) => void
}

export function FilterBar({ categories, totalCount, filteredCount, onFilterChange }: FilterBarProps) {
  const [query, setQuery]         = useState("")
  const [selCats, setSelCats]     = useState<Set<string>>(new Set())
  const [gsmRange, setGsmRange]   = useState<number | null>(null)
  const [sort, setSort]           = useState<FilterState["sort"]>("relevance")
  const [expanded, setExpanded]   = useState(false)

  const active = selCats.size > 0 || gsmRange !== null || query.length > 0

  function emit(overrides?: Partial<FilterState>) {
    onFilterChange({
      query,
      categories: selCats,
      gsmRange,
      sort,
      ...overrides,
    })
  }

  function toggleCat(cat: string) {
    const next = new Set(selCats)
    next.has(cat) ? next.delete(cat) : next.add(cat)
    setSelCats(next)
    emit({ categories: next })
  }

  function toggleGsm(idx: number) {
    const next = gsmRange === idx ? null : idx
    setGsmRange(next)
    emit({ gsmRange: next })
  }

  function clearAll() {
    setQuery(""); setSelCats(new Set()); setGsmRange(null); setSort("relevance")
    onFilterChange({ query: "", categories: new Set(), gsmRange: null, sort: "relevance" })
  }

  const chipBase = "shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-[900] uppercase tracking-wider transition-all"
  const chipOff  = `${chipBase} border-white/10 text-neutral-500 hover:border-white/30 hover:text-white`
  const chipOn   = `${chipBase} bg-[#FDCB02] border-[#FDCB02] text-black`

  return (
    <div className="sticky top-[168px] z-[90] w-full bg-[#070707]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
      {/* BARRA PRINCIPAL */}
      <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        {/* Buscador rápido */}
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-[#111] border border-white/10 rounded-md px-3 h-9 focus-within:border-[#FDCB02] transition-colors">
          <Search size={13} className="text-neutral-600 shrink-0"/>
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); emit({ query: e.target.value }) }}
            placeholder="Buscar tela..."
            className="bg-transparent flex-1 text-[11px] font-bold text-white placeholder:text-neutral-700 outline-none uppercase tracking-wider min-w-0"
          />
          {query && (
            <button onClick={() => { setQuery(""); emit({ query: "" }) }}>
              <X size={12} className="text-neutral-500 hover:text-white"/>
            </button>
          )}
        </div>

        {/* Chips de categoría — scroll horizontal en mobile */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={selCats.has(cat) ? chipOn : chipOff}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Controles derecha */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[10px] font-bold text-neutral-600 hidden md:block">
            {filteredCount === totalCount
              ? `${totalCount} refs`
              : <><span className="text-[#FDCB02]">{filteredCount}</span>/{totalCount}</>
            }
          </span>

          <button
            onClick={() => setExpanded(v => !v)}
            className={`flex items-center gap-2 px-3 h-8 rounded-md border text-[10px] font-[900] uppercase tracking-widest transition-all ${expanded || active ? 'bg-[#FDCB02] border-[#FDCB02] text-black' : 'border-white/10 text-neutral-500 hover:border-white/30 hover:text-white'}`}
          >
            <SlidersHorizontal size={12}/>
            <span className="hidden sm:inline">Filtros</span>
            {active && <span className="bg-black/20 rounded-full px-1.5">{selCats.size + (gsmRange !== null ? 1 : 0)}</span>}
          </button>

          <select
            value={sort}
            onChange={e => { const v = e.target.value as FilterState["sort"]; setSort(v); emit({ sort: v }) }}
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
      {expanded && (
        <div className="max-w-[1920px] mx-auto px-4 md:px-6 py-4 border-t border-white/5 flex flex-wrap gap-6 items-start">
          <div>
            <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mb-2">Gramaje (gsm)</p>
            <div className="flex flex-wrap gap-2">
              {GSM_RANGES.map((r, i) => (
                <button key={i} onClick={() => toggleGsm(i)} className={gsmRange === i ? chipOn : chipOff}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {active && (
            <button
              onClick={clearAll}
              className="ml-auto self-end flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-400/40 px-3 py-1.5 rounded-md"
            >
              <X size={12}/> Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── HOOK: aplica los filtros sobre el array de productos ───────────────────
export function useFilteredProducts(products: any[], filters: FilterState) {
  return useMemo(() => {
    let result = [...products]

    if (filters.query) {
      const q = filters.query.toLowerCase()
      result = result.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.composicion?.toLowerCase().includes(q) ||
        String(p.gramaje).includes(q)
      )
    }

    if (filters.categories.size > 0) {
      result = result.filter(p => filters.categories.has(p.category))
    }

    if (filters.gsmRange !== null) {
      result = result.filter(p => GSM_RANGES[filters.gsmRange!].fn(Number(p.gramaje)))
    }

    switch (filters.sort) {
      case "price_asc":  result.sort((a, b) => (a.prices?.menudeo ?? 0) - (b.prices?.menudeo ?? 0)); break
      case "price_desc": result.sort((a, b) => (b.prices?.menudeo ?? 0) - (a.prices?.menudeo ?? 0)); break
      case "gsm":        result.sort((a, b) => Number(a.gramaje) - Number(b.gramaje)); break
    }

    return result
  }, [products, filters])
}