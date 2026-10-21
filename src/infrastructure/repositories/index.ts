/** Implementaciones de los repositorios sobre LocalDb (localStorage). */
import type {
  ICertificadoRepository,
  ICorreoRepository,
  IEstudianteRepository,
  ILogRepository,
  INotaRepository,
  IPagoRepository,
  IProgramaRepository,
  ISolicitudRepository,
  ITipoCertificadoRepository,
  NuevaSolicitud,
  Repositorios,
  Resolucion,
} from '@/domain/repositories'
import type { AnalisisIA, Certificado, EstadoSolicitud } from '@/domain/entities'
import type { LocalDb } from '../localDb'

const ahora = () => new Date().toISOString()

export class LocalEstudianteRepository implements IEstudianteRepository {
  constructor(private db: LocalDb) {}
  listar() {
    return this.db.tablas.estudiantes
  }
  buscarPorCodigo(codigo: string) {
    return this.db.tablas.estudiantes.find((e) => e.codigo === codigo.trim()) ?? null
  }
  buscarPorId(id: number) {
    return this.db.tablas.estudiantes.find((e) => e.id === id) ?? null
  }
}

export class LocalProgramaRepository implements IProgramaRepository {
  constructor(private db: LocalDb) {}
  buscarPorId(id: number) {
    return this.db.tablas.programas.find((p) => p.id === id) ?? null
  }
}

export class LocalNotaRepository implements INotaRepository {
  constructor(private db: LocalDb) {}
  listarPorEstudiante(estudianteId: number) {
    return this.db.tablas.notas.filter((n) => n.estudianteId === estudianteId)
  }
}

export class LocalTipoCertificadoRepository implements ITipoCertificadoRepository {
  constructor(private db: LocalDb) {}
  listar() {
    return this.db.tablas.tipos_certificado
  }
  buscarPorId(id: number) {
    return this.db.tablas.tipos_certificado.find((t) => t.id === id) ?? null
  }
}

export class LocalPagoRepository implements IPagoRepository {
  constructor(private db: LocalDb) {}
  listar() {
    return this.db.tablas.pagos
  }
  buscarPorReferencia(referencia: string) {
    return this.db.tablas.pagos.find((p) => p.referencia === referencia) ?? null
  }
  buscarPorId(id: number) {
    return this.db.tablas.pagos.find((p) => p.id === id) ?? null
  }
  marcarUsado(id: number) {
    const pago = this.buscarPorId(id)
    if (!pago || pago.usado) return false
    pago.usado = true
    this.db.guardar()
    return true
  }
}

export class LocalSolicitudRepository implements ISolicitudRepository {
  constructor(private db: LocalDb) {}
  crear(datos: NuevaSolicitud) {
    const solicitud = {
      ...datos,
      id: this.db.siguienteId(this.db.tablas.solicitudes),
      analisis: null,
      estado: 'RECIBIDA' as const,
      motivo: null,
      resueltoPor: null,
      pagoId: null,
      fechaCreacion: ahora(),
      fechaResolucion: null,
    }
    this.db.tablas.solicitudes.push(solicitud)
    this.db.guardar()
    return solicitud
  }
  buscarPorId(id: number) {
    return this.db.tablas.solicitudes.find((s) => s.id === id) ?? null
  }
  listar(filtro?: { estado?: EstadoSolicitud }) {
    return this.db.tablas.solicitudes
      .filter((s) => !filtro?.estado || s.estado === filtro.estado)
      .sort((a, b) => b.id - a.id)
  }
  guardarAnalisis(id: number, analisis: AnalisisIA) {
    const s = this.buscarPorId(id)
    if (!s) return
    s.analisis = analisis
    this.db.guardar()
  }
  resolver(id: number, r: Resolucion) {
    const s = this.buscarPorId(id)
    if (!s) return
    s.estado = r.estado
    s.motivo = r.motivo
    s.resueltoPor = r.resueltoPor
    if (r.pagoId !== undefined) s.pagoId = r.pagoId
    s.fechaResolucion = r.estado === 'REVISION' ? null : ahora()
    this.db.guardar()
  }
}

export class LocalCertificadoRepository implements ICertificadoRepository {
  constructor(private db: LocalDb) {}
  crear(datos: Omit<Certificado, 'id' | 'fechaEmision'>) {
    const cert = { ...datos, id: this.db.siguienteId(this.db.tablas.certificados), fechaEmision: ahora() }
    this.db.tablas.certificados.push(cert)
    this.db.guardar()
    return cert
  }
  buscarPorCodigo(codigo: string) {
    const c = codigo.trim().toUpperCase()
    return this.db.tablas.certificados.find((x) => x.codigoVerificacion === c) ?? null
  }
  buscarPorSolicitud(solicitudId: number) {
    return this.db.tablas.certificados.find((x) => x.solicitudId === solicitudId) ?? null
  }
}

export class LocalLogRepository implements ILogRepository {
  constructor(private db: LocalDb) {}
  registrar(solicitudId: number | null, evento: string, detalle = '') {
    this.db.tablas.log_eventos.push({
      id: this.db.siguienteId(this.db.tablas.log_eventos),
      solicitudId,
      evento,
      detalle,
      fecha: ahora(),
    })
    this.db.guardar()
  }
  listarPorSolicitud(solicitudId: number) {
    return this.db.tablas.log_eventos.filter((l) => l.solicitudId === solicitudId)
  }
}

export class LocalCorreoRepository implements ICorreoRepository {
  constructor(private db: LocalDb) {}
  guardar(correo: { para: string; asunto: string; cuerpo: string }) {
    this.db.tablas.correos.push({ ...correo, id: this.db.siguienteId(this.db.tablas.correos), fecha: ahora() })
    this.db.guardar()
  }
  listar() {
    return [...this.db.tablas.correos].reverse()
  }
}

export const crearRepositoriosLocales = (db: LocalDb): Repositorios => ({
  estudiantes: new LocalEstudianteRepository(db),
  programas: new LocalProgramaRepository(db),
  notas: new LocalNotaRepository(db),
  tipos: new LocalTipoCertificadoRepository(db),
  pagos: new LocalPagoRepository(db),
  solicitudes: new LocalSolicitudRepository(db),
  certificados: new LocalCertificadoRepository(db),
  logs: new LocalLogRepository(db),
  correos: new LocalCorreoRepository(db),
})
