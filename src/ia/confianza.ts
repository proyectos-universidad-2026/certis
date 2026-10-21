/**
 * Puntaje de confianza global (0..1).
 * Combina la confianza del OCR, la probabilidad del clasificador y la
 * coincidencia de los campos extraídos con el pago registrado.
 */
import type { CamposExtraidos, Pago } from '@/domain/entities'

export const PESOS = { ocr: 0.35, clasificador: 0.35, campos: 0.3 }

export function puntajeCampos(campos: CamposExtraidos, pago: Pago | null, documentoEstudiante: string): number {
  const chequeos = [
    campos.referencia !== null,
    campos.valor !== null,
    campos.fecha !== null,
    pago !== null && campos.valor === pago.valor,
    campos.documento === documentoEstudiante || (pago !== null && campos.documento === pago.documentoPagador),
  ]
  return chequeos.filter(Boolean).length / chequeos.length
}

export function calcularConfianza(ocr: number, probRecibo: number, campos: number): number {
  const c = PESOS.ocr * ocr + PESOS.clasificador * probRecibo + PESOS.campos * campos
  return Math.round(Math.min(1, Math.max(0, c)) * 1000) / 1000
}
