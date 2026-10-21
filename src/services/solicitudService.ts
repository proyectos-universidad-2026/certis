/**
 * Caso de uso principal: Solicitar certificado.
 * Valida → guarda la solicitud → IA analiza → motor de reglas decide → emite / escala / rechaza.
 * Solo depende de interfaces de repositorio (inyectadas en el constructor).
 */
import {
  ErrorNegocio,
  type Certificado,
  type EstadoSolicitud,
  type Estudiante,
  type LogEvento,
  type Pago,
  type Programa,
  type Solicitud,
  type TipoCertificado,
} from '@/domain/entities'
import type { Repositorios } from '@/domain/repositories'
import type { EscenarioId } from '@/ia/escenarios'
import { ErrorServicioIA } from '@/ia/ocrSimulado'
import { analizarRecibo, razonar } from '@/ia/servicioIA'
import { evaluar } from '@/reglas/motor'
import { firmar, generarCodigoVerificacion, generarPdf } from './certificadoService'
import { CORREO_FUNCIONARIO, CORREO_SOPORTE, Notificador } from './notificador'

export const MAX_BYTES = 5 * 1024 * 1024
export const TIPOS_PERMITIDOS = ['application/pdf', 'image/jpeg', 'image/png']
export const HORAS_ESCALAMIENTO = 24

export interface DatosFormulario {
  codigo: string
  documento: string
  correo: string
  tipoId: number
  archivo: File | null
  escenario: EscenarioId
}

export interface DetalleSolicitud {
  solicitud: Solicitud
  estudiante: Estudiante
  programa: Programa | null
  tipo: TipoCertificado
  pago: Pago | null
  certificado: Certificado | null
  eventos: LogEvento[]
  escalada: boolean
}

export interface Metricas {
  total: number
  porEstado: Record<EstadoSolicitud, number>
  tasaAutomatizacion: number
  tasaRevision: number
  tiempoPromedioSeg: number | null
  certificadosEmitidos: number
  escaladas: number
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarArchivo(archivo: File | null): string | null {
  if (!archivo) return 'Debes adjuntar el recibo de pago.'
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) return 'Formato no permitido. Sube un PDF, JPG o PNG.'
  if (archivo.size > MAX_BYTES) return 'El archivo supera el máximo de 5 MB.'
  return null
}

/** Miniatura JPEG del recibo para el panel admin (no se guarda el archivo completo). */
async function crearMiniatura(archivo: File): Promise<string | null> {
  if (!archivo.type.startsWith('image/') || typeof document === 'undefined') return null
  try {
    const bitmap = await createImageBitmap(archivo)
    const escala = Math.min(1, 640 / bitmap.width)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width * escala
    canvas.height = bitmap.height * escala
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.75)
  } catch {
    return null
  }
}

export class SolicitudService {
  private notificador: Notificador

  constructor(private repos: Repositorios) {
    this.notificador = new Notificador(repos.correos)
  }

  async crear(f: DatosFormulario, onPaso?: (i: number) => void, retardo?: number): Promise<number> {
    // 1. Validación del formulario (automatización)
    if (!f.codigo.trim() || !f.documento.trim() || !f.correo.trim()) throw new ErrorNegocio('Completa todos los campos obligatorios.')
    if (!EMAIL.test(f.correo)) throw new ErrorNegocio('El correo no tiene un formato válido.')
    const estudiante = this.repos.estudiantes.buscarPorCodigo(f.codigo)
    if (!estudiante) throw new ErrorNegocio(`El estudiante con código ${f.codigo} no existe.`)
    if (estudiante.documento !== f.documento.trim()) throw new ErrorNegocio('El documento no corresponde al código estudiantil.')
    const tipo = this.repos.tipos.buscarPorId(f.tipoId)
    if (!tipo) throw new ErrorNegocio('Selecciona el tipo de certificado.')
    const errorArchivo = validarArchivo(f.archivo)
    if (errorArchivo) throw new ErrorNegocio(errorArchivo)
    const archivo = f.archivo!

    // 2. Registro de la solicitud
    const solicitud = this.repos.solicitudes.crear({
      estudianteId: estudiante.id,
      tipoId: tipo.id,
      correo: f.correo.trim(),
      archivoNombre: archivo.name,
      archivoPreview: await crearMiniatura(archivo),
    })
    const log = (evento: string, detalle?: string) => this.repos.logs.registrar(solicitud.id, evento, detalle)
    log('SOLICITUD_RECIBIDA', `${tipo.nombre} · archivo ${archivo.name} (${Math.round(archivo.size / 1024)} KB)`)

    // 3. Servicio de IA (con degradación controlada si falla)
    let ia
    try {
      ia = await analizarRecibo({
        archivo,
        escenario: f.escenario,
        contexto: { estudiante, tipo, pagos: this.repos.pagos.listar() },
        buscarPago: (ref) => this.repos.pagos.buscarPorReferencia(ref),
        onPaso,
        retardo,
      })
    } catch (e) {
      const detalle = e instanceof ErrorServicioIA ? e.message : 'Error inesperado del servicio de IA.'
      log('IA_NO_DISPONIBLE', detalle)
      this.repos.solicitudes.resolver(solicitud.id, {
        estado: 'REVISION',
        motivo: 'El servicio de IA no respondió. Tu solicitud quedó guardada y un funcionario la revisará (máximo 24 h).',
        resueltoPor: null,
      })
      this.notificador.enviar(CORREO_FUNCIONARIO, `Solicitud #${solicitud.id} pendiente (IA no disponible)`, detalle)
      this.notificarEstudiante(solicitud.id)
      return solicitud.id
    }

    const razonamiento = razonar(ia, tipo.tarifa)
    this.repos.solicitudes.guardarAnalisis(solicitud.id, {
      textoOcr: ia.texto,
      ocrConfianza: ia.ocrConfianza,
      probRecibo: ia.probRecibo,
      campos: ia.campos,
      confianza: ia.confianza,
      razonamiento,
    })
    log('IA_ANALISIS', `OCR ${Math.round(ia.ocrConfianza * 100)} % · recibo ${Math.round(ia.probRecibo * 100)} % · confianza ${Math.round(ia.confianza * 100)} % · ref ${ia.campos.referencia ?? '—'}`)

    // 4. Motor de reglas
    const decision = evaluar({
      texto: ia.texto,
      ocrConfianza: ia.ocrConfianza,
      probRecibo: ia.probRecibo,
      campos: ia.campos,
      pago: ia.pago,
      tarifa: tipo.tarifa,
      confianza: ia.confianza,
    })
    log('REGLA_APLICADA', `${decision.regla} → ${decision.estado}`)
    if (decision.posibleFraude) log('POSIBLE_FRAUDE', `Reutilización del pago ${ia.pago?.referencia}`)

    if (decision.estado === 'APROBADA' && ia.pago) {
      if (!this.repos.pagos.marcarUsado(ia.pago.id)) {
        this.repos.solicitudes.resolver(solicitud.id, { estado: 'RECHAZADA', motivo: 'El pago acaba de ser usado por otra solicitud.', resueltoPor: 'SISTEMA', pagoId: ia.pago.id })
      } else {
        await this.aprobar(solicitud.id, decision.motivo, 'SISTEMA', ia.pago.id)
      }
    } else {
      this.repos.solicitudes.resolver(solicitud.id, {
        estado: decision.estado,
        motivo: decision.motivo,
        resueltoPor: decision.estado === 'REVISION' ? null : 'SISTEMA',
        pagoId: ia.pago?.id ?? null,
      })
      if (decision.estado === 'REVISION')
        this.notificador.enviar(CORREO_FUNCIONARIO, `Solicitud #${solicitud.id} requiere revisión manual`, decision.motivo)
    }
    this.notificarEstudiante(solicitud.id)
    return solicitud.id
  }

  /** Emite el certificado: código, firma, registro. Si falla, la solicitud va a revisión y se avisa a soporte. */
  private async aprobar(id: number, motivo: string, por: 'SISTEMA' | 'FUNCIONARIO', pagoId: number | null) {
    const detalle = this.detalle(id)
    try {
      const codigo = generarCodigoVerificacion()
      const hashFirma = await firmar(`${codigo}|${detalle.estudiante.documento}|${detalle.tipo.clave}|${new Date().toISOString()}`)
      const certificado = this.repos.certificados.crear({ solicitudId: id, codigoVerificacion: codigo, hashFirma })
      await generarPdf({ ...detalle, certificado, notas: this.repos.notas.listarPorEstudiante(detalle.estudiante.id) })
      this.repos.solicitudes.resolver(id, { estado: 'APROBADA', motivo, resueltoPor: por, pagoId })
      this.repos.logs.registrar(id, 'CERTIFICADO_EMITIDO', `Código ${codigo}`)
    } catch (e) {
      this.repos.logs.registrar(id, 'ERROR_PDF', String(e))
      this.repos.solicitudes.resolver(id, { estado: 'REVISION', motivo: 'No se pudo generar el PDF tras 3 intentos. Soporte TI fue notificado.', resueltoPor: null })
      this.notificador.enviar(CORREO_SOPORTE, `Error generando PDF de la solicitud #${id}`, String(e))
    }
  }

  private notificarEstudiante(id: number) {
    const d = this.detalle(id)
    const s = d.solicitud
    const textos: Record<EstadoSolicitud, string> = {
      APROBADA: `Tu ${d.tipo.nombre.toLowerCase()} fue emitido. Código de verificación: ${d.certificado?.codigoVerificacion}.`,
      REVISION: `Tu solicitud está en revisión manual. ${s.motivo ?? ''}`,
      RECHAZADA: `Tu solicitud fue rechazada. Motivo: ${s.motivo ?? ''}`,
      RECIBIDA: 'Recibimos tu solicitud.',
    }
    this.notificador.enviar(s.correo, `CertiBot · Solicitud #${s.id}: ${s.estado}`, textos[s.estado])
    this.repos.logs.registrar(id, 'CORREO_ENVIADO', `Para ${s.correo} (simulado)`)
  }

  /** Decisión manual de un funcionario sobre una solicitud en revisión. */
  async revisar(id: number, aprobar: boolean, comentario: string) {
    const d = this.detalle(id)
    if (d.solicitud.estado !== 'REVISION') throw new ErrorNegocio('Solo se pueden revisar solicitudes en revisión manual.')
    this.repos.logs.registrar(id, 'REVISION_MANUAL', `${aprobar ? 'Aprobada' : 'Rechazada'} por funcionario. ${comentario}`)
    if (aprobar) {
      if (d.pago && !d.pago.usado) this.repos.pagos.marcarUsado(d.pago.id)
      await this.aprobar(id, comentario || 'Aprobada tras revisión manual del recibo.', 'FUNCIONARIO', d.pago?.id ?? null)
    } else {
      this.repos.solicitudes.resolver(id, { estado: 'RECHAZADA', motivo: comentario || 'Rechazada tras revisión manual.', resueltoPor: 'FUNCIONARIO' })
    }
    this.notificarEstudiante(id)
  }

  detalle(id: number): DetalleSolicitud {
    const solicitud = this.repos.solicitudes.buscarPorId(id)
    if (!solicitud) throw new ErrorNegocio(`La solicitud #${id} no existe.`)
    const estudiante = this.repos.estudiantes.buscarPorId(solicitud.estudianteId)!
    const horas = (Date.now() - new Date(solicitud.fechaCreacion).getTime()) / 3_600_000
    return {
      solicitud,
      estudiante,
      programa: this.repos.programas.buscarPorId(estudiante.programaId),
      tipo: this.repos.tipos.buscarPorId(solicitud.tipoId)!,
      pago: solicitud.pagoId ? this.repos.pagos.buscarPorId(solicitud.pagoId) : null,
      certificado: this.repos.certificados.buscarPorSolicitud(id),
      eventos: this.repos.logs.listarPorSolicitud(id),
      escalada: solicitud.estado === 'REVISION' && horas > HORAS_ESCALAMIENTO,
    }
  }

  listar(estado?: EstadoSolicitud): DetalleSolicitud[] {
    return this.repos.solicitudes.listar({ estado }).map((s) => this.detalle(s.id))
  }

  async descargarPdf(solicitudId: number): Promise<Blob> {
    const d = this.detalle(solicitudId)
    if (!d.certificado) throw new ErrorNegocio('Esta solicitud no tiene certificado emitido.')
    return generarPdf({ ...d, certificado: d.certificado, notas: this.repos.notas.listarPorEstudiante(d.estudiante.id) })
  }

  verificar(codigo: string): DetalleSolicitud | null {
    const cert = this.repos.certificados.buscarPorCodigo(codigo)
    return cert ? this.detalle(cert.solicitudId) : null
  }

  metricas(): Metricas {
    const todas = this.repos.solicitudes.listar()
    const porEstado = { RECIBIDA: 0, APROBADA: 0, REVISION: 0, RECHAZADA: 0 } as Record<EstadoSolicitud, number>
    todas.forEach((s) => porEstado[s.estado]++)
    const automaticas = todas.filter((s) => s.resueltoPor === 'SISTEMA').length
    const revisadas = todas.filter((s) => s.estado === 'REVISION' || s.resueltoPor === 'FUNCIONARIO').length
    const emitidasAuto = todas.filter((s) => s.estado === 'APROBADA' && s.fechaResolucion)
    const tiempos = emitidasAuto.map((s) => (new Date(s.fechaResolucion!).getTime() - new Date(s.fechaCreacion).getTime()) / 1000)
    return {
      total: todas.length,
      porEstado,
      tasaAutomatizacion: todas.length ? automaticas / todas.length : 0,
      tasaRevision: todas.length ? revisadas / todas.length : 0,
      tiempoPromedioSeg: tiempos.length ? tiempos.reduce((a, b) => a + b, 0) / tiempos.length : null,
      certificadosEmitidos: porEstado.APROBADA,
      escaladas: this.listar('REVISION').filter((d) => d.escalada).length,
    }
  }
}
