/** Entidades del dominio de CertiBot. No dependen de React ni del almacenamiento. */

export type EstadoSolicitud = 'RECIBIDA' | 'APROBADA' | 'REVISION' | 'RECHAZADA'
export type ResueltoPor = 'SISTEMA' | 'FUNCIONARIO'
export type ClaveCertificado = 'notas' | 'estudio' | 'matricula' | 'paz_y_salvo'

export interface Programa {
  id: number
  nombre: string
  facultad: string
}

export interface Estudiante {
  id: number
  codigo: string
  documento: string
  nombres: string
  apellidos: string
  correo: string
  programaId: number
  estado: 'ACTIVO' | 'EGRESADO' | 'INACTIVO'
}

export interface Nota {
  id: number
  estudianteId: number
  asignatura: string
  periodo: string
  nota: number
  creditos: number
}

export interface TipoCertificado {
  id: number
  clave: ClaveCertificado
  nombre: string
  tarifa: number
}

/** Simula lo que reportaría el banco o la pasarela de pagos. */
export interface Pago {
  id: number
  referencia: string
  valor: number
  fecha: string
  documentoPagador: string
  banco: string
  usado: boolean
}

/** Campos que la IA extrae del recibo. */
export interface CamposExtraidos {
  referencia: string | null
  valor: number | null
  fecha: string | null
  documento: string | null
  banco: string | null
}

export interface AnalisisIA {
  textoOcr: string
  ocrConfianza: number
  probRecibo: number
  campos: CamposExtraidos
  confianza: number
  razonamiento: string
}

export interface Solicitud {
  id: number
  estudianteId: number
  tipoId: number
  correo: string
  archivoNombre: string
  /** Vista previa del recibo (data URL) para el panel administrativo. */
  archivoPreview: string | null
  analisis: AnalisisIA | null
  estado: EstadoSolicitud
  motivo: string | null
  resueltoPor: ResueltoPor | null
  pagoId: number | null
  fechaCreacion: string
  fechaResolucion: string | null
}

export interface Certificado {
  id: number
  solicitudId: number
  codigoVerificacion: string
  hashFirma: string
  fechaEmision: string
}

export interface LogEvento {
  id: number
  solicitudId: number | null
  evento: string
  detalle: string
  fecha: string
}

export interface CorreoSimulado {
  id: number
  para: string
  asunto: string
  cuerpo: string
  fecha: string
}

/** Error de negocio que la interfaz muestra tal cual al usuario. */
export class ErrorNegocio extends Error {}
