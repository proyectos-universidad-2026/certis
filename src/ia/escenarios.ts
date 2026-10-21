/**
 * Recibos de demostración y escenarios de simulación.
 * Como el prototipo no tiene backend ni OCR real, el "OCR simulado" devuelve el
 * texto que tendría cada recibo. El resto del pipeline (extracción, clasificador,
 * confianza y reglas) SÍ se ejecuta de verdad sobre ese texto.
 */

export type EscenarioId =
  | 'auto'
  | 'valido'
  | 'valido_2'
  | 'valor_menor'
  | 'usado'
  | 'no_recibo'
  | 'borroso'
  | 'ref_inexistente'
  | 'ia_caida'

export interface DatosRecibo {
  banco: string
  titulo: string
  referencia: string
  valor: number
  fecha: string // dd/mm/aaaa
  documento: string
  pagador: string
}

export interface ReciboDemo {
  id: Exclude<EscenarioId, 'auto' | 'ia_caida'>
  nombreArchivo: string
  titulo: string
  descripcion: string
  resultadoEsperado: 'APROBADA' | 'REVISION' | 'RECHAZADA'
  /** Si es null, el documento no es un recibo (se muestra otro contenido). */
  recibo: DatosRecibo | null
  borroso?: boolean
}

const PAGADOR = 'Laura Camila Pérez Gómez'
const DOC = '1001234567'

export const recibosDemo: ReciboDemo[] = [
  {
    id: 'valido',
    nombreArchivo: 'recibo_valido_784512.png',
    titulo: '1. Recibo válido',
    descripcion: 'Pago de $25.000 registrado y sin usar. Úsalo con el certificado de notas.',
    resultadoEsperado: 'APROBADA',
    recibo: { banco: 'Bancolombia', titulo: 'COMPROBANTE DE PAGO', referencia: '784512', valor: 25000, fecha: '14/10/2026', documento: DOC, pagador: PAGADOR },
  },
  {
    id: 'valor_menor',
    nombreArchivo: 'recibo_valor_menor_784513.png',
    titulo: '2. Valor menor a la tarifa',
    descripcion: 'Pagó $10.000, pero el certificado de notas cuesta $25.000.',
    resultadoEsperado: 'RECHAZADA',
    recibo: { banco: 'Davivienda', titulo: 'COMPROBANTE DE TRANSACCIÓN', referencia: '784513', valor: 10000, fecha: '14/10/2026', documento: DOC, pagador: PAGADOR },
  },
  {
    id: 'usado',
    nombreArchivo: 'recibo_ya_usado_784514.png',
    titulo: '3. Recibo ya usado',
    descripcion: 'El pago existe pero ya se usó en otra solicitud (posible fraude).',
    resultadoEsperado: 'RECHAZADA',
    recibo: { banco: 'Banco de Bogotá', titulo: 'RECIBO DE CAJA', referencia: '784514', valor: 25000, fecha: '30/09/2026', documento: DOC, pagador: PAGADOR },
  },
  {
    id: 'no_recibo',
    nombreArchivo: 'horario_clases_no_recibo.png',
    titulo: '4. No es un recibo',
    descripcion: 'Una foto de un horario de clases. El clasificador debe detectarlo.',
    resultadoEsperado: 'RECHAZADA',
    recibo: null,
  },
  {
    id: 'borroso',
    nombreArchivo: 'recibo_borroso_784515.png',
    titulo: '5. Foto borrosa',
    descripcion: 'Recibo real pero ilegible: el OCR tiene baja confianza y va a revisión manual.',
    resultadoEsperado: 'REVISION',
    recibo: { banco: 'BBVA', titulo: 'COMPROBANTE DE PAGO', referencia: '784515', valor: 25000, fecha: '15/10/2026', documento: DOC, pagador: PAGADOR },
    borroso: true,
  },
  {
    id: 'ref_inexistente',
    nombreArchivo: 'recibo_ref_no_registrada_990001.png',
    titulo: '6. Referencia no registrada',
    descripcion: 'El pago aún no aparece en la pasarela: se envía a revisión manual.',
    resultadoEsperado: 'REVISION',
    recibo: { banco: 'Nequi', titulo: 'CONSTANCIA DE PAGO', referencia: '990001', valor: 25000, fecha: '19/10/2026', documento: DOC, pagador: PAGADOR },
  },
  {
    id: 'valido_2',
    nombreArchivo: 'recibo_valido_784526.png',
    titulo: '7. Otro recibo válido',
    descripcion: 'Pago de $25.000 sin usar; sirve para cualquier tipo de certificado.',
    resultadoEsperado: 'APROBADA',
    recibo: { banco: 'Banco de Bogotá', titulo: 'COMPROBANTE DE PAGO PSE', referencia: '784526', valor: 25000, fecha: '19/10/2026', documento: DOC, pagador: PAGADOR },
  },
]

export const escenariosSeleccionables: { id: EscenarioId; nombre: string }[] = [
  { id: 'auto', nombre: 'Automático (según el archivo)' },
  ...recibosDemo.map((r) => ({ id: r.id, nombre: r.titulo })),
  { id: 'ia_caida', nombre: '8. Servicio de IA caído' },
]

export const formatoValorRecibo = (v: number) => `$ ${v.toLocaleString('es-CO')},00`

/** Texto que "leería" el OCR en un recibo. */
export function textoDeRecibo(r: DatosRecibo): string {
  return [
    r.banco.toUpperCase(),
    r.titulo,
    'Transacción exitosa',
    `Referencia de pago: ${r.referencia}`,
    `Valor pagado: ${formatoValorRecibo(r.valor)}`,
    `Fecha: ${r.fecha}`,
    `Pagador: ${r.pagador}`,
    `Documento del pagador: C.C. ${r.documento}`,
    'Concepto: Certificado académico',
    'Estado: APROBADO',
    'Conserve este comprobante como soporte de su pago.',
  ].join('\n')
}

export const textoHorario = [
  'HORARIO DE CLASES - SEMESTRE 2026-2',
  'Lunes 7:00 - 9:00 Programación I - Aula 204',
  'Martes 9:00 - 11:00 Bases de Datos - Laboratorio 3',
  'Miércoles 14:00 - 16:00 Inteligencia Artificial - Aula 101',
  'Jueves 7:00 - 9:00 Inglés III - Bloque B',
  'Viernes 10:00 - 12:00 Ética profesional - Auditorio',
  'Docente tutor: consultar en la plataforma virtual',
].join('\n')
