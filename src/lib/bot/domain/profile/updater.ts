/**
 * Pipeline de actualización de perfil al recibir un mensaje del cliente.
 *
 * REEMPLAZA el `analizarPatronesCliente` del monolito v1.
 *
 * Recibe (perfil, mensaje, historial) y devuelve un nuevo perfil con TODOS
 * los scores y tácticas recalculados. NO toca Redis, NO llama a OpenAI.
 *
 * El orquestador llama a esta función, recibe el nuevo perfil, y lo guarda
 * con `clientRepo.save()`. Si en el futuro queremos cambiar el orden o agregar
 * más reglas, se modifica solo este archivo y todos los tests siguen sirviendo
 * de regresión.
 */

import type { ClientePerfil, MensajeHistorial } from "../../types/domain";
import {
  actualizarConfianza,
  actualizarPropensionCross,
  actualizarTemperatura,
  calcularDeltaTemperatura,
  calcularDiasEntreCompras,
  calcularPatronCompra,
  predecirSiguientePedido,
} from "./scoring";
import { calcularSegmento } from "./segmentation";
import { seleccionarTactica } from "../sales/tactics";

export interface UpdateContext {
  /** Mensaje recién recibido del cliente. */
  mensaje: string;
  /** Historial de la conversación al momento (incluye mensajes previos). */
  historial: MensajeHistorial[];
}

/**
 * Pipeline puro de actualización.
 *
 * Orden importa porque algunos pasos dependen de los anteriores
 * (tactic depende de temperatura recién actualizada, predicción depende de
 * diasEntreCompras recién calculado).
 */
export function actualizarPerfilConMensaje(
  perfil: ClientePerfil,
  ctx: UpdateContext
): ClientePerfil {
  const { mensaje, historial } = ctx;

  // 1. Temperatura: leer mensaje y aplicar delta suavizado
  const delta = calcularDeltaTemperatura(perfil, mensaje);
  const temperaturaCompra = actualizarTemperatura(
    perfil.temperaturaCompra,
    delta
  );

  // 2. Confianza: escanear todo el historial por tono
  const nivelConfianza = actualizarConfianza(
    perfil.nivelConfianza,
    historial
  );

  // 3. Cross-sell: actualizar propensión según producto pedido
  const propensionCross = actualizarPropensionCross(
    perfil.propensionCross,
    mensaje
  );

  // 4. Segmentación: depende de compras acumuladas (no del mensaje)
  const segmento = calcularSegmento(perfil);

  // 5. Construir perfil parcial con scores actualizados (necesario para
  //    que la táctica vea la temperatura nueva, no la vieja)
  const conScores: ClientePerfil = {
    ...perfil,
    temperaturaCompra,
    nivelConfianza,
    propensionCross,
    segmento,
  };

  // 6. Táctica: depende de temperatura, objeciones y total de compras
  const tacticaActual = seleccionarTactica(conScores);

  // 7. Patrón y predicción: requieren días entre compras actualizado
  const diasEntreCompras =
    calcularDiasEntreCompras(conScores) ?? perfil.diasEntreCompras;

  const conPatron: ClientePerfil = {
    ...conScores,
    tacticaActual,
    diasEntreCompras,
  };

  const patronCompra = calcularPatronCompra(conPatron) ?? perfil.patronCompra;
  const prediccionSiguientePedido =
    predecirSiguientePedido(conPatron) ?? perfil.prediccionSiguientePedido;

  return {
    ...conPatron,
    patronCompra,
    prediccionSiguientePedido,
  };
}
