/** Dibuja los recibos de demostración como SVG y los convierte en archivos PNG reales. */
import { formatoValorRecibo, type ReciboDemo } from '@/ia/escenarios'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const COLORES: Record<string, string> = {
  Bancolombia: '#fdda24',
  Davivienda: '#ed1c27',
  'Banco de Bogotá': '#00366c',
  BBVA: '#004481',
  Nequi: '#da0081',
}

export function svgRecibo(demo: ReciboDemo): string {
  const W = 480
  const H = 600
  if (!demo.recibo) {
    const filas = [
      ['Lunes', '7:00 - 9:00', 'Programación I', 'Aula 204'],
      ['Martes', '9:00 - 11:00', 'Bases de Datos', 'Lab. 3'],
      ['Miércoles', '14:00 - 16:00', 'Inteligencia Artificial', 'Aula 101'],
      ['Jueves', '7:00 - 9:00', 'Inglés III', 'Bloque B'],
      ['Viernes', '10:00 - 12:00', 'Ética profesional', 'Auditorio'],
    ]
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">
      <rect width="${W}" height="${H}" fill="#fffdf5"/>
      <text x="${W / 2}" y="60" text-anchor="middle" font-size="22" font-weight="bold" fill="#1e3a8a">HORARIO DE CLASES</text>
      <text x="${W / 2}" y="88" text-anchor="middle" font-size="14" fill="#555">Semestre 2026-2</text>
      ${filas
        .map(
          (f, i) => `<rect x="30" y="${120 + i * 80}" width="${W - 60}" height="68" rx="10" fill="${['#dbeafe', '#dcfce7', '#fef9c3', '#fae8ff', '#ffe4e6'][i]}"/>
      <text x="48" y="${148 + i * 80}" font-size="16" font-weight="bold" fill="#111">${f[0]} · ${f[1]}</text>
      <text x="48" y="${172 + i * 80}" font-size="14" fill="#333">${esc(f[2])} — ${f[3]}</text>`,
        )
        .join('')}
      <text x="${W / 2}" y="${H - 30}" text-anchor="middle" font-size="12" fill="#777">Docente tutor: consultar en la plataforma virtual</text>
    </svg>`
  }
  const r = demo.recibo
  const color = COLORES[r.banco] ?? '#334155'
  const textoHeader = r.banco === 'Bancolombia' ? '#111' : '#fff'
  const campo = (y: number, etiqueta: string, valor: string, grande = false) =>
    `<text x="40" y="${y}" font-size="13" fill="#666">${esc(etiqueta)}</text>
     <text x="${W - 40}" y="${y}" font-size="${grande ? 20 : 15}" text-anchor="end" font-weight="bold" fill="#111">${esc(valor)}</text>
     <line x1="40" y1="${y + 14}" x2="${W - 40}" y2="${y + 14}" stroke="#e5e7eb"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial, Helvetica, sans-serif">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <rect width="${W}" height="96" fill="${color}"/>
    <text x="${W / 2}" y="48" text-anchor="middle" font-size="26" font-weight="bold" fill="${textoHeader}">${esc(r.banco.toUpperCase())}</text>
    <text x="${W / 2}" y="76" text-anchor="middle" font-size="14" fill="${textoHeader}">${esc(r.titulo)}</text>
    <circle cx="${W / 2}" cy="140" r="22" fill="#16a34a"/>
    <path d="M${W / 2 - 10} 140 l7 7 l13 -14" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
    <text x="${W / 2}" y="190" text-anchor="middle" font-size="16" font-weight="bold" fill="#16a34a">Transacción exitosa</text>
    ${campo(240, 'Referencia de pago', r.referencia)}
    ${campo(290, 'Valor pagado', formatoValorRecibo(r.valor), true)}
    ${campo(340, 'Fecha', r.fecha)}
    ${campo(390, 'Pagador', r.pagador)}
    ${campo(440, 'Documento del pagador', 'C.C. ' + r.documento)}
    ${campo(490, 'Concepto', 'Certificado académico')}
    <text x="${W / 2}" y="${H - 40}" text-anchor="middle" font-size="11" fill="#888">Conserve este comprobante como soporte de su pago.</text>
  </svg>`
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

/** Rasteriza el SVG a PNG (con desenfoque si es la foto borrosa) y lo devuelve como File. */
export async function reciboComoArchivo(demo: ReciboDemo): Promise<File> {
  const img = new Image()
  img.src = svgDataUrl(svgRecibo(demo))
  await img.decode()
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  if (demo.borroso) ctx.filter = 'blur(3px)'
  ctx.drawImage(img, 0, 0)
  const blob = await new Promise<Blob>((ok) => canvas.toBlob((b) => ok(b!), 'image/png'))
  return new File([blob], demo.nombreArchivo, { type: 'image/png' })
}
