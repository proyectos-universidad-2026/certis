/**
 * Contenedor de dependencias: aquí se decide QUÉ implementación de los repositorios se usa.
 * Para conectar un backend real, se reemplaza crearRepositoriosLocales por repositorios HTTP.
 */
import { LocalDb } from './infrastructure/localDb'
import { crearRepositoriosLocales } from './infrastructure/repositories'
import { SolicitudService } from './services/solicitudService'

export const db = new LocalDb()
export const repositorios = crearRepositoriosLocales(db)
export const solicitudService = new SolicitudService(repositorios)
