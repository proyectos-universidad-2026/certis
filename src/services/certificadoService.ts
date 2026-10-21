/**
 * Generación del certificado en PDF (jsPDF) con código QR y código único de verificación.
 * La firma digital es simulada: un hash SHA-256 de los datos del certificado.
 */
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { Certificado, Estudiante, Nota, Programa, TipoCertificado } from '@/domain/entities'

export const INSTITUCION = 'Universidad CertiBot (Demo)'
export const OFICINA = 'Oficina de Registro y Control Académico'

export interface DatosCertificado {
  certificado: Certificado
  estudiante: Estudiante
  programa: Programa | null
  tipo: TipoCertificado
  notas: Nota[]
}

export function generarCodigoVerificacion(): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return 'CB-' + [...bytes].map((b) => alfabeto[b % alfabeto.length]).join('')
}

export async function firmar(datos: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(datos))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const origen = () => (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173')
export const urlVerificacion = (codigo: string) => `${origen()}/verificar/${codigo}`

function cuerpoSegunTipo(d: DatosCertificado): string {
  const nombre = `${d.estudiante.nombres} ${d.estudiante.apellidos}`.toUpperCase()
  const prog = d.programa?.nombre ?? 'su programa'
  const base = `Que ${nombre}, identificado(a) con cédula de ciudadanía No. ${d.estudiante.documento} y código estudiantil ${d.estudiante.codigo},`
  switch (d.tipo.clave) {
    case 'estudio':
      return `${base} ${d.estudiante.estado === 'EGRESADO' ? 'cursó' : 'cursa actualmente'} el programa de ${prog} de la ${d.programa?.facultad ?? 'institución'}, en modalidad presencial.`
    case 'matricula':
      return `${base} se encuentra matriculado(a) en el programa de ${prog} para el período académico 2026-2.`
    case 'paz_y_salvo':
      return `${base} del programa de ${prog}, se encuentra a PAZ Y SALVO por todo concepto académico con la institución a la fecha de expedición.`
    default:
      return `${base} del programa de ${prog}, obtuvo las siguientes calificaciones:`
  }
}

/** Genera el PDF con reintentos (hasta 3), como indica el plan de contingencia. */
export async function generarPdf(d: DatosCertificado, reintentos = 3): Promise<Blob> {
  let ultimoError: unknown
  for (let intento = 1; intento <= reintentos; intento++) {
    try {
      return await construirPdf(d)
    } catch (e) {
      ultimoError = e
    }
  }
  throw ultimoError
}

async function construirPdf(d: DatosCertificado): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' })
  const ancho = doc.internal.pageSize.getWidth()
  const { certificado, tipo } = d

  // Encabezado
  doc.setFillColor(67, 56, 202)
  doc.rect(0, 0, ancho, 28, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold').setFontSize(16)
  doc.text(INSTITUCION, ancho / 2, 13, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(10)
  doc.text(OFICINA, ancho / 2, 20, { align: 'center' })

  doc.setTextColor(30, 30, 30)
  doc.setFont('helvetica', 'bold').setFontSize(15)
  doc.text(tipo.nombre.toUpperCase(), ancho / 2, 44, { align: 'center' })
  doc.setFont('helvetica', 'normal').setFontSize(11)
  doc.text(`La ${OFICINA} CERTIFICA:`, 20, 58)
  const lineas = doc.splitTextToSize(cuerpoSegunTipo(d), ancho - 40)
  doc.text(lineas, 20, 68)
  let y = 68 + lineas.length * 6 + 4

  if (tipo.clave === 'notas') {
    doc.setFont('helvetica', 'bold').setFontSize(10)
    doc.setFillColor(238, 238, 248)
    doc.rect(20, y - 5, ancho - 40, 8, 'F')
    doc.text('Asignatura', 22, y)
    doc.text('Período', 120, y)
    doc.text('Créditos', 148, y)
    doc.text('Nota', 175, y)
    doc.setFont('helvetica', 'normal')
    y += 8
    for (const n of d.notas) {
      doc.text(n.asignatura, 22, y)
      doc.text(n.periodo, 120, y)
      doc.text(String(n.creditos), 152, y)
      doc.text(n.nota.toFixed(1), 176, y)
      y += 7
    }
    const creditos = d.notas.reduce((s, n) => s + n.creditos, 0)
    const promedio = d.notas.reduce((s, n) => s + n.nota * n.creditos, 0) / (creditos || 1)
    doc.setFont('helvetica', 'bold')
    doc.text(`Promedio ponderado: ${promedio.toFixed(2)}`, 22, y + 3)
    y += 12
  }

  doc.setFont('helvetica', 'normal').setFontSize(11)
  const fecha = new Date(certificado.fechaEmision).toLocaleDateString('es-CO', { dateStyle: 'long' })
  doc.text(`Se expide a solicitud del interesado el ${fecha}.`, 20, y + 6)

  // Firma simulada
  doc.setDrawColor(120, 120, 120)
  doc.line(20, y + 32, 90, y + 32)
  doc.setFont('helvetica', 'bold').setFontSize(10)
  doc.text('Jefe(a) de Registro y Control Académico', 20, y + 37)
  doc.setFont('helvetica', 'normal').setFontSize(8)
  doc.text('Firma digital simulada (prototipo CertiBot)', 20, y + 42)

  // QR + código de verificación
  const qr = await QRCode.toDataURL(urlVerificacion(certificado.codigoVerificacion), { margin: 1, width: 300 })
  doc.addImage(qr, 'PNG', ancho - 58, y + 14, 38, 38)
  doc.setFontSize(9).setFont('helvetica', 'bold')
  doc.text(certificado.codigoVerificacion, ancho - 39, y + 57, { align: 'center' })

  // Pie
  const alto = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(110, 110, 110)
  doc.text(`Verifique la autenticidad en ${urlVerificacion(certificado.codigoVerificacion)}`, 20, alto - 18)
  doc.text(`Huella SHA-256: ${certificado.hashFirma}`, 20, alto - 13)
  doc.text('Documento generado automáticamente por CertiBot. Prototipo académico sin validez oficial.', 20, alto - 8)

  return doc.output('blob')
}
