/**
 * Contratos del patrón Repository.
 * Los servicios solo conocen estas interfaces; la implementación concreta
 * (hoy: localStorage del navegador) se inyecta en src/container.ts.
 * Para conectar un backend real basta con crear implementaciones HTTP.
 */
import type {
  AnalisisIA,
  Certificado,
  CorreoSimulado,
  EstadoSolicitud,
  Estudiante,
  LogEvento,
  Nota,
  Pago,
  Programa,
  ResueltoPor,
  Solicitud,
  TipoCertificado,
} from './entities'

export interface IEstudianteRepository {
  listar(): Estudiante[]
  buscarPorCodigo(codigo: string): Estudiante | null
  buscarPorId(id: number): Estudiante | null
}

export interface IProgramaRepository {
  buscarPorId(id: number): Programa | null
}

export interface INotaRepository {
  listarPorEstudiante(estudianteId: number): Nota[]
}

export interface ITipoCertificadoRepository {
  listar(): TipoCertificado[]
  buscarPorId(id: number): TipoCertificado | null
}

export interface IPagoRepository {
  listar(): Pago[]
  buscarPorReferencia(referencia: string): Pago | null
  buscarPorId(id: number): Pago | null
  /** Marca el pago como usado. Devuelve false si ya estaba usado (evita duplicados). */
  marcarUsado(id: number): boolean
}

export interface NuevaSolicitud {
  estudianteId: number
  tipoId: number
  correo: string
  archivoNombre: string
  archivoPreview: string | null
}

export interface Resolucion {
  estado: EstadoSolicitud
  motivo: string | null
  resueltoPor: ResueltoPor | null
  pagoId?: number | null
}

export interface ISolicitudRepository {
  crear(datos: NuevaSolicitud): Solicitud
  buscarPorId(id: number): Solicitud | null
  listar(filtro?: { estado?: EstadoSolicitud }): Solicitud[]
  guardarAnalisis(id: number, analisis: AnalisisIA): void
  resolver(id: number, resolucion: Resolucion): void
}

export interface ICertificadoRepository {
  crear(datos: Omit<Certificado, 'id' | 'fechaEmision'>): Certificado
  buscarPorCodigo(codigo: string): Certificado | null
  buscarPorSolicitud(solicitudId: number): Certificado | null
}

export interface ILogRepository {
  registrar(solicitudId: number | null, evento: string, detalle?: string): void
  listarPorSolicitud(solicitudId: number): LogEvento[]
}

export interface ICorreoRepository {
  guardar(correo: Omit<CorreoSimulado, 'id' | 'fecha'>): void
  listar(): CorreoSimulado[]
}

export interface Repositorios {
  estudiantes: IEstudianteRepository
  programas: IProgramaRepository
  notas: INotaRepository
  tipos: ITipoCertificadoRepository
  pagos: IPagoRepository
  solicitudes: ISolicitudRepository
  certificados: ICertificadoRepository
  logs: ILogRepository
  correos: ICorreoRepository
}
