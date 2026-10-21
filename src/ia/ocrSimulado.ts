/**
 * OCR SIMULADO.
 * En la versión con backend aquí iría Tesseract/EasyOCR. En este prototipo
 * de frontend se "lee" el texto según el recibo de demostración elegido
 * (o se detecta por el nombre del archivo), con ruido y confianza realistas.
 */
import type { Estudiante, Pago, TipoCertificado } from '@/domain/entities'
import { rng } from './dataset'
import { recibosDemo, textoDeRecibo, textoHorario, type EscenarioId } from './escenarios'

export interface ResultadoOcr {
  texto: string
  confianza: number
  escenario: EscenarioId
}

export interface ContextoOcr {
  estudiante: Estudiante
  tipo: TipoCertificado
  pagos: Pago[]
}

export class ErrorServicioIA extends Error {}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7)

/** Degrada el texto como lo haría una foto borrosa. */
function degradar(texto: string, semilla: number, nivel: number) {
  const r = rng(semilla)
  const parecidos: Record<string, string> = { '0': 'O', '1': 'l', '5': 'S', '8': 'B', a: 'o', e: 'c', r: 'n' }
  return [...texto]
    .map((c) => {
      const x = r()
      if (x < nivel * 0.5) return parecidos[c] ?? '·'
      if (x < nivel) return ''
      return c
    })
    .join('')
}

export function detectarEscenario(nombreArchivo: string): EscenarioId {
  const n = nombreArchivo.toLowerCase()
  const demo = recibosDemo.find((r) => r.nombreArchivo === n)
  if (demo) return demo.id
  if (n.includes('borroso') || n.includes('blur')) return 'borroso'
  if (n.includes('usado') || n.includes('duplicado')) return 'usado'
  if (n.includes('menor')) return 'valor_menor'
  if (n.includes('horario') || n.includes('no_recibo')) return 'no_recibo'
  if (n.includes('990001') || n.includes('no_registrada')) return 'ref_inexistente'
  return 'auto'
}

export async function leerTexto(archivo: File, escenarioElegido: EscenarioId, ctx: ContextoOcr): Promise<ResultadoOcr> {
  const escenario = escenarioElegido === 'auto' ? detectarEscenario(archivo.name) : escenarioElegido
  const h = hash(archivo.name + archivo.size)
  const confianzaLimpia = 0.9 + (h % 70) / 1000 // entre 0.90 y 0.97

  if (escenario === 'ia_caida') throw new ErrorServicioIA('Tiempo de espera agotado al llamar al servicio de OCR (timeout 90 s).')

  if (escenario === 'no_recibo') return { texto: textoHorario, confianza: confianzaLimpia, escenario }

  const demo = recibosDemo.find((r) => r.id === escenario)
  if (demo?.recibo) {
    const texto = textoDeRecibo(demo.recibo)
    return demo.borroso
      ? { texto: degradar(texto, h, 0.28), confianza: 0.42, escenario }
      : { texto, confianza: confianzaLimpia, escenario }
  }

  // Archivo propio del usuario: se simula un recibo con un pago pendiente del estudiante.
  const pago = ctx.pagos.find((p) => !p.usado && p.documentoPagador === ctx.estudiante.documento && p.valor >= ctx.tipo.tarifa)
  const [a, m, d] = (pago?.fecha ?? new Date().toISOString().slice(0, 10)).split('-')
  const texto = textoDeRecibo({
    banco: pago?.banco ?? 'Bancolombia',
    titulo: 'COMPROBANTE DE PAGO',
    referencia: pago?.referencia ?? String(900000 + (h % 99999)),
    valor: pago?.valor ?? ctx.tipo.tarifa,
    fecha: `${d}/${m}/${a}`,
    documento: ctx.estudiante.documento,
    pagador: `${ctx.estudiante.nombres} ${ctx.estudiante.apellidos}`,
  })
  return { texto, confianza: confianzaLimpia, escenario: 'auto' }
}
