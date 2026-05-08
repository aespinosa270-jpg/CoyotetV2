/**
 * Tipos del dominio de Coyote Textil.
 *
 * ⚠️ ESTE ARCHIVO REEMPLAZA al de Fase 0. Cambios:
 *  - Agregado ProductoColor con hex e imagen (preserva info de src/lib/products.ts).
 *  - Producto ahora lleva `slug` para búsqueda conversacional ("alaska" → prod_alaska).
 *  - Tipos consistentes con la fuente de verdad en src/lib/{products,hilos,elasticos}.ts.
 */

import type { MembershipPlanId } from "../config/constants";

// ── Identidad ──────────────────────────────────────────────────────
export type Genero = "hombre" | "mujer" | "unknown";

export type Segmento =
  | "prospecto"
  | "nuevo"
  | "recurrente"
  | "vip"
  | "inactivo";

export type EtapaAbandono = "carrito" | "cotizacion" | "pago" | null;

export type Sensibilidad = "alta" | "media" | "baja";

export type Tactica =
  | "cierre_directo"
  | "urgencia_escasez"
  | "manejo_objecion"
  | "fidelizacion_vip"
  | "social_proof"
  | "valor_rendimiento";

// ── Cotización ─────────────────────────────────────────────────────
export interface Cotizacion {
  productos: string;
  kg: number;
  subtotal: number;
  subtotalConEnvio: number;
  subtotalConEnvioConIva: number;
  cp: string;
  direccion: string;
  conFactura: boolean;
  rfc?: string;
  razon?: string;
  regimen?: string;
  uso?: string;
  fecha: string; // ISO
}

// ── Recordatorio ───────────────────────────────────────────────────
export interface Recordatorio {
  tipo: "reactivacion" | "carrito" | "cotizacion" | "pago" | "custom";
  fecha: string; // ISO
  mensaje: string;
}

// ── Propensión cross-sell ─────────────────────────────────────────
export interface PropensionCross {
  hilos: number; // 0-100
  elasticos: number; // 0-100
  volumenExtra: number; // 0-100
}

// ── Perfil del cliente ─────────────────────────────────────────────
export interface ClientePerfil {
  // Identidad
  telefono: string;
  nombre: string;
  correoElectronico?: string;
  correoVerificado: boolean;
  genero: Genero;

  // Onboarding / privacidad
  privacidadAceptada?: boolean;
  privacidadRespondida: boolean;
  terminosAceptados: boolean;

  // Timestamps
  primerContacto: string; // ISO
  ultimoContacto: string; // ISO

  // Compras
  totalCompras: number;
  montoAcumulado: number;
  ticketPromedio?: number;
  productosComprados: string[];
  productosFavoritos: string[];
  categoriasPedidas: string[];
  ultimaFechaCompra?: string;
  diasEntreCompras?: number;

  // Logística
  direccionEnvio: string;
  cpFiscal: string;

  // Preferencias y comportamiento
  metodoPagoFavorito: string;
  requiereFrecuenteFactura: boolean;
  sensibilidadPrecio: Sensibilidad;
  preferencias: string[];
  interesesDeclarados: string[];
  canalPreferido?: string;
  mejorMomentoContacto?: string;
  cumpleanos?: string;

  // Notas libres
  notas: string;

  // Segmentación
  segmento: Segmento;

  // Estado de venta actual
  etapaAbandono: EtapaAbandono;
  fechaAbandono?: string;
  ultimaCotizacion?: string;
  ultimaCotizacionObj?: Cotizacion;
  intentosDePago: number;
  recordatoriosPendientes: Recordatorio[];

  // Aprendizaje / scoring
  temperaturaCompra: number; // 0-100
  nivelConfianza: number; // 0-100
  tacticaActual: Tactica;
  prediccionSiguientePedido?: string;
  patronCompra?: string;
  resumenSemantico?: string;
  propensionCross: PropensionCross;

  // Objeciones
  objecionesComunes: string[];
  vectorObjeciones: Record<string, number>;
  ultimaObjecionResuelta?: string;
  razonNoCompra?: string;

  // Membresía
  tieneSuscripcion: boolean;
  planMembresia?: MembershipPlanId;
  membresiaOfrecida: boolean;

  // Campañas / reactivación
  ultimaCampana?: string;
  tasaConversion?: number;
}

// ── Pedido (registro histórico) ────────────────────────────────────
export interface PedidoRegistro {
  fecha: string; // ISO
  productos: string;
  monto: number;
  metodo: string;
  conFactura: boolean;
}

// ── Color de producto (mirror de src/lib/products.ts ProductColor) ──
export interface ProductoColor {
  /** Nombre legible. Ej: "Azul Rey", "Rosa Neón". */
  nombre: string;
  /** Hex code para UI / matching visual. Ej: "#1434A4". */
  hex: string;
  /** Ruta a la imagen del swatch, si existe. Ej: "/assets/products/.../azulrey.jpg". */
  imagen?: string;
}

// ── Producto del catálogo ──────────────────────────────────────────
export type CategoriaProducto = "telas" | "telasMetro" | "hilos" | "elasticos";

export interface PrecioProducto {
  menudeo: number;
  mayoreo: number;
}

export interface ProductoBase extends PrecioProducto {
  /** ID estable del catálogo. Ej: "prod_alaska", "hilo-kingtex-40-2". */
  id: string;
  /** Nombre de display. Ej: "Alaska", "Hilo Kingtex 40/2". */
  nombre: string;
  /** Slug para búsqueda conversacional. Ej: "alaska", "kyoto", "hilo-kingtex". */
  slug: string;
  /** Descripción / ficha técnica. */
  info: string;
  /** Categoría para discriminación. */
  categoria: CategoriaProducto;
  /** Categoría libre desde el archivo fuente. Ej: "Línea Invernal". */
  categoriaLibre?: string;
  /** Origen: "Importado" | "MX". */
  origen?: string;
  /** Path al thumbnail principal (lo trae el archivo fuente). */
  thumbnail?: string;
}

export interface TelaPorKilo extends ProductoBase {
  categoria: "telas";
  /** Rendimiento en metros por kilo (ej. 4.3 para Micropique). */
  rendimientoMxKg: number;
  /** Gramaje en g/m² (ej. 145). */
  gramaje?: number;
  /** Ancho del rollo en metros (ej. 1.6). */
  ancho?: number;
  /** Kilos por rollo (típicamente 25, Flanel es 27). */
  kgPorRollo: number;
  /** Paleta de colores. Vacía si es color único por rollo. */
  colores: ProductoColor[];
  /** True si el rollo viene en un solo color (no hay paleta a elegir). */
  colorUnico: boolean;
}

export interface TelaPorMetro extends ProductoBase {
  categoria: "telasMetro";
  metrosPorRollo: number;
  gramaje?: number;
  ancho?: number;
  colores: ProductoColor[];
  colorUnico: boolean;
}

export interface Hilo extends ProductoBase {
  categoria: "hilos";
  unidad: "pieza/cono" | "cono" | "caja";
  /** Piezas por caja (típicamente 120 para Kingtex). */
  piezasPorCaja?: number;
  /** Metros por cono (típicamente 5000 para Kingtex 40/2). */
  metrosPorCono?: number;
  colores: ProductoColor[];
}

export interface Elastico extends ProductoBase {
  categoria: "elasticos";
  unidad: "metro" | "pieza (50cm)" | "cono";
  /** Si se vende por metro: metros por rollo (ej. 50 para beisbolero). */
  metrosPorRollo?: number;
  colores: ProductoColor[];
}

export type Producto = TelaPorKilo | TelaPorMetro | Hilo | Elastico;

// ── Configuración del bot (lo que Jack edita) ──────────────────────
export interface PromocionActiva {
  nombre: string;
  descripcion: string;
  descuento: string;
  vigencia: string;
}

export interface ConfigBot {
  nombreBot: string;
  tono: string;
  frasesBienvenida: string[];
  frasesDesignacionHombre: string[];
  frasesDesignacionMujer: string[];
  fraseCierre: string;
  fraseIncondicional: string;
  emojisPrincipales: string;
  maximoLineasRespuesta: number;
  fraseProhibidas: string[];
  instruccionesEspeciales: string;
  promocionesActivas: PromocionActiva[];
  infoPagos: string;
  infoEnvios: string;
  mensajePromoFinal: string;
  avisoGeneral: string;
  horarioAtencion: string;
  ultimaActualizacion: string; // ISO
  actualizadoPor: string;
}

// ── Mensaje en historial conversacional ────────────────────────────
export type RolHistorial = "user" | "assistant" | "system" | "tool";

export interface MensajeHistorial {
  role: RolHistorial;
  content: string;
  /** Si role === 'tool', cuál tool y con qué args/resultado. */
  toolCall?: {
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  };
  timestamp: string; // ISO
}

// ── Overlay de catálogo (overrides en Redis) ───────────────────────
/**
 * Cuando Jack cambia un precio por WhatsApp, se guarda en Redis como overlay
 * sobre el archivo fuente. El catalog-repo aplica estos overrides al cargar.
 */
export interface CatalogOverlay {
  /** Precios sobreescritos. Key = product.id. */
  priceOverrides: Record<string, Partial<PrecioProducto>>;
  /** Productos ocultados (no aparecen en el bot aunque estén en el fuente). */
  hiddenProductIds: string[];
  /** Productos completamente nuevos (creados por Jack vía PRODUCTO_NUEVO). */
  customProducts: Producto[];
  /** Última actualización para auditoría. */
  lastUpdated: string; // ISO
  lastUpdatedBy: string;
}