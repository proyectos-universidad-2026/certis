/**
 * MOTOR DE REGLAS (automatización determinista).
 * La IA nunca emite el certificado: solo entrega su interpretación del recibo.
 * Estas reglas deciden. Misma entrada → misma salida. Principio: ante la duda, escala a un humano.
 */
import type { CamposExtraidos, EstadoSolicitud, Pago } from '@/domain/entities'
import { formatoPesos } from '@/lib/utils'

export const UMBRALES = {
  confianza: 0.8,
  ocr: 0.6,
  recibo: 0.6,
  textoMinimo: 20,
}

export interface EntradaMotor {
  texto: string
  ocrConfianza: number
  probRecibo: number
  campos: CamposExtraidos
  pago: Pago | null
  tarifa: number
  confianza: number
}

export interface Decision {
  estado: Exclude<EstadoSolicitud, 'RECIBIDA'>
  motivo: string
  /** Identificador de la regla que se disparó (para auditoría). */
  regla: string
  posibleFraude?: boolean
}

const pct = (v: number) => `${Math.round(v * 100)} %`

export function evaluar(e: EntradaMotor): Decision {
  if (e.texto.trim().length < UMBRALES.textoMinimo)
    return { estado: 'RECHAZADA', regla: 'R1_ILEGIBLE', motivo: 'No se pudo leer el documento. Sube otra foto con buena luz y sin reflejos.' }

  if (e.ocrConfianza < UMBRALES.ocr)
    return { estado: 'REVISION', regla: 'R2_OCR_BAJO', motivo: `La imagen es poco legible (confianza del OCR ${pct(e.ocrConfianza)}). Un funcionario la revisará; también puedes subir una foto más nítida.` }

  if (e.probRecibo < UMBRALES.recibo)
    return { estado: 'RECHAZADA', regla: 'R3_NO_RECIBO', motivo: `El archivo no parece un recibo de pago (probabilidad ${pct(e.probRecibo)}). Sube el comprobante que entrega el banco.` }

  if (!e.campos.referencia)
    return { estado: 'REVISION', regla: 'R4_SIN_REFERENCIA', motivo: 'No se encontró el número de referencia en el recibo. Pasa a revisión manual.' }

  if (!e.pago)
    return { estado: 'REVISION', regla: 'R5_REF_NO_EXISTE', motivo: `La referencia ${e.campos.referencia} no aparece en los pagos registrados (puede no estar sincronizada todavía). Pasa a revisión manual.` }

  if (e.pago.usado)
    return { estado: 'RECHAZADA', regla: 'R6_DUPLICADO', posibleFraude: true, motivo: `El pago con referencia ${e.pago.referencia} ya fue usado en otra solicitud. Se registró como posible duplicado.` }

  if (e.pago.valor < e.tarifa)
    return { estado: 'RECHAZADA', regla: 'R7_VALOR_INSUFICIENTE', motivo: `El valor pagado (${formatoPesos(e.pago.valor)}) es menor que la tarifa (${formatoPesos(e.tarifa)}). Faltan ${formatoPesos(e.tarifa - e.pago.valor)}.` }

  if (e.campos.valor !== null && e.campos.valor !== e.pago.valor)
    return { estado: 'REVISION', regla: 'R8_VALOR_NO_COINCIDE', motivo: `El valor leído (${formatoPesos(e.campos.valor)}) no coincide con el registrado (${formatoPesos(e.pago.valor)}). Posible alteración: revisión manual.` }

  if (e.confianza < UMBRALES.confianza)
    return { estado: 'REVISION', regla: 'R9_CONFIANZA_BAJA', motivo: `La confianza del análisis (${pct(e.confianza)}) es menor al ${pct(UMBRALES.confianza)}. Pasa a revisión manual.` }

  return { estado: 'APROBADA', regla: 'R10_APROBAR', motivo: 'Pago verificado: la referencia existe, el valor cubre la tarifa y el pago no había sido usado.' }
}
