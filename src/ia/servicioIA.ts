/**
 * Servicio de IA: orquesta OCR → extracción → clasificación → confianza.
 * Devuelve la interpretación del recibo; NO decide (eso lo hace el motor de reglas).
 */
import type { CamposExtraidos, Pago } from '@/domain/entities'
import { esperar } from '@/lib/utils'
import { esRecibo } from './clasificador'
import { calcularConfianza, puntajeCampos } from './confianza'
import type { EscenarioId } from './escenarios'
import { extraerCampos } from './extractor'
import { leerTexto, type ContextoOcr } from './ocrSimulado'

export const PASOS_IA = [
  'Preparando imagen (escala de grises y binarización)',
  'Leyendo el texto del recibo (OCR)',
  'Extrayendo referencia, valor, fecha y documento',
  'Clasificando el documento (TF-IDF + Regresión Logística)',
  'Conciliando con los pagos y calculando la confianza',
] as const

export interface ResultadoServicioIA {
  texto: string
  ocrConfianza: number
  probRecibo: number
  campos: CamposExtraidos
  pago: Pago | null
  confianza: number
  escenario: EscenarioId
}

export interface OpcionesIA {
  archivo: File
  escenario: EscenarioId
  contexto: ContextoOcr
  buscarPago: (referencia: string) => Pago | null
  onPaso?: (indice: number) => void
  /** Pausa entre pasos para que la demo se vea (ms). */
  retardo?: number
}

export async function analizarRecibo(o: OpcionesIA): Promise<ResultadoServicioIA> {
  const paso = async (i: number) => {
    o.onPaso?.(i)
    await esperar(o.retardo ?? 550)
  }

  await paso(0)
  await paso(1)
  const ocr = await leerTexto(o.archivo, o.escenario, o.contexto)

  await paso(2)
  const campos = extraerCampos(ocr.texto)

  await paso(3)
  const probRecibo = Math.round(esRecibo(ocr.texto) * 1000) / 1000

  await paso(4)
  const pago = campos.referencia ? o.buscarPago(campos.referencia) : null
  const confianza = calcularConfianza(ocr.confianza, probRecibo, puntajeCampos(campos, pago, o.contexto.estudiante.documento))

  return { texto: ocr.texto, ocrConfianza: ocr.confianza, probRecibo, campos, pago, confianza, escenario: ocr.escenario }
}

/** Explica en lenguaje natural lo que "pensó" el sistema. */
export function razonar(r: ResultadoServicioIA, tarifa: number): string {
  const p = (v: number) => v.toFixed(2).replace('.', ',')
  const partes = [
    r.probRecibo >= 0.6
      ? `Este archivo parece un recibo (probabilidad ${p(r.probRecibo)}).`
      : `Este archivo no parece un recibo (probabilidad ${p(r.probRecibo)}).`,
  ]
  if (r.campos.referencia || r.campos.valor) {
    const valor = r.campos.valor ? ` y el valor $${r.campos.valor.toLocaleString('es-CO')}` : ''
    partes.push(`Leí la referencia ${r.campos.referencia ?? '(no encontrada)'}${valor}.`)
  }
  if (r.pago) {
    const cubre = r.pago.valor >= tarifa ? 'cubre' : 'no cubre'
    partes.push(`La referencia existe en los pagos registrados y su valor ${cubre} la tarifa${r.pago.usado ? ', pero ya fue usada' : ''}.`)
  } else if (r.campos.referencia) {
    partes.push('No encontré esa referencia en los pagos registrados.')
  }
  partes.push(
    r.confianza >= 0.8
      ? `La confianza es alta (${p(r.confianza)}), así que las reglas pueden actuar solas.`
      : `La confianza es ${p(r.confianza)}; prefiero que un humano lo revise.`,
  )
  return partes.join(' ')
}
