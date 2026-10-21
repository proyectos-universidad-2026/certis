/**
 * "Base de datos" simulada: tablas en memoria persistidas en localStorage.
 * Reemplaza al DBMS real en este prototipo sin backend.
 */
import type {
  Certificado,
  CorreoSimulado,
  Estudiante,
  LogEvento,
  Nota,
  Pago,
  Programa,
  Solicitud,
  TipoCertificado,
} from '@/domain/entities'
import { estudiantesSeed, notasSeed, pagosSeed, programasSeed, tiposSeed } from '@/data/seed'

export interface Tablas {
  programas: Programa[]
  estudiantes: Estudiante[]
  notas: Nota[]
  tipos_certificado: TipoCertificado[]
  pagos: Pago[]
  solicitudes: Solicitud[]
  certificados: Certificado[]
  log_eventos: LogEvento[]
  correos: CorreoSimulado[]
}

const CLAVE = 'certibot-db-v1'

const semilla = (): Tablas =>
  structuredClone({
    programas: programasSeed,
    estudiantes: estudiantesSeed,
    notas: notasSeed,
    tipos_certificado: tiposSeed,
    pagos: pagosSeed,
    solicitudes: [],
    certificados: [],
    log_eventos: [],
    correos: [],
  })

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export class LocalDb {
  tablas: Tablas

  constructor(persistir = true) {
    this.persistir = persistir
    this.tablas = this.cargar()
  }

  private readonly persistir: boolean

  private cargar(): Tablas {
    const crudo = this.persistir ? storage()?.getItem(CLAVE) : null
    if (!crudo) return semilla()
    try {
      return { ...semilla(), ...JSON.parse(crudo) }
    } catch {
      return semilla()
    }
  }

  siguienteId(tabla: { id: number }[]) {
    return tabla.reduce((max, f) => Math.max(max, f.id), 0) + 1
  }

  guardar() {
    if (!this.persistir) return
    try {
      storage()?.setItem(CLAVE, JSON.stringify(this.tablas))
    } catch {
      // Cuota llena: se eliminan las vistas previas de recibos antiguos y se reintenta.
      this.tablas.solicitudes.forEach((s) => (s.archivoPreview = null))
      try {
        storage()?.setItem(CLAVE, JSON.stringify(this.tablas))
      } catch {
        /* se sigue trabajando solo en memoria */
      }
    }
  }

  /** Restaura los datos semilla (útil antes de una demostración). */
  reiniciar() {
    this.tablas = semilla()
    this.guardar()
  }
}
