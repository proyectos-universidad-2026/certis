/**
 * Extracción de entidades del texto del recibo (regex + heurísticas)
 * y limpieza de datos: $ 25.000,00 → 25000, dd/mm/aaaa → ISO, referencias sin espacios.
 */
import type { CamposExtraidos } from '@/domain/entities'

const BANCOS = [
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA', 'Banco de Occidente', 'Banco Popular',
  'Banco Agrario', 'Scotiabank Colpatria', 'Nequi', 'Daviplata', 'PSE', 'Efecty', 'Baloto',
]

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7,
  agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** "$ 25.000,00" → 25000 · "25,000.50" → 25000 · "18000" → 18000 */
export function normalizarValor(crudo: string): number | null {
  let s = crudo.replace(/[^\d.,]/g, '')
  if (!/\d/.test(s)) return null
  const ultimoPunto = s.lastIndexOf('.')
  const ultimaComa = s.lastIndexOf(',')
  if (ultimoPunto >= 0 && ultimaComa >= 0) {
    // El separador que aparece de último es el decimal.
    const dec = ultimoPunto > ultimaComa ? '.' : ','
    const miles = dec === '.' ? ',' : '.'
    s = s.split(miles).join('').replace(dec, '.')
  } else {
    const sep = ultimoPunto >= 0 ? '.' : ultimaComa >= 0 ? ',' : null
    if (sep) {
      const decimales = s.length - s.lastIndexOf(sep) - 1
      // Con 1 o 2 dígitos al final es decimal; con 3 es separador de miles.
      s = decimales === 3 ? s.split(sep).join('') : s.split(sep).join('').slice(0, -decimales) + '.' + s.slice(-decimales)
    }
  }
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n) : null
}

/** "12/10/2026", "12-10-2026", "2026-10-12" o "12 de octubre de 2026" → "2026-10-12" */
export function normalizarFecha(crudo: string): string | null {
  const t = sinTildes(crudo.toLowerCase())
  let d: number, m: number, a: number
  let r = t.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (r) [a, m, d] = [+r[1], +r[2], +r[3]]
  else if ((r = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) [d, m, a] = [+r[1], +r[2], +r[3]]
  else if ((r = t.match(/(\d{1,2})\s+de\s+([a-z]+)\s+(?:de\s+)?(\d{4})/)) && MESES[r[2]]) [d, m, a] = [+r[1], MESES[r[2]], +r[3]]
  else return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Quita espacios, guiones y puntos de una referencia. */
export const limpiarReferencia = (s: string) => s.replace(/[\s.-]/g, '')

export function extraerCampos(texto: string): CamposExtraidos {
  const plano = sinTildes(texto)

  const ref = plano.match(/(?:referencia|ref\.?|codigo de pago|no\.?\s*de\s*transaccion)[^\d\n]{0,25}(\d[\d\s-]{3,20}\d)/i)
  const valor = plano.match(/(?:valor|total|monto|importe)[^\d\n$]{0,25}\$?\s*(\d[\d.,\s]*\d)/i)
  const fecha = plano.match(/fecha[^\d\n]{0,15}([^\n]{6,30})/i)
  const doc = plano.match(/(?:documento|c\.?\s?c\.?|cedula|identificacion|nit)[^\d\n]{0,25}(\d[\d.\s]{5,14}\d)/i)
  const banco = BANCOS.find((b) => sinTildes(texto).toLowerCase().includes(sinTildes(b).toLowerCase())) ?? null

  return {
    referencia: ref ? limpiarReferencia(ref[1]) : null,
    valor: valor ? normalizarValor(valor[1]) : null,
    fecha: fecha ? normalizarFecha(fecha[1]) : null,
    documento: doc ? doc[1].replace(/\D/g, '') : null,
    banco,
  }
}
