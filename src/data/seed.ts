/**
 * Datos semilla (simulan el sistema académico y la pasarela de pagos).
 * 10 estudiantes, 3 programas, 50 notas, 4 tipos de certificado y 15 pagos (5 ya usados).
 */
import type { Estudiante, Nota, Pago, Programa, TipoCertificado } from '@/domain/entities'

export const programasSeed: Programa[] = [
  { id: 1, nombre: 'Ingeniería de Sistemas', facultad: 'Facultad de Ingeniería' },
  { id: 2, nombre: 'Administración de Empresas', facultad: 'Facultad de Ciencias Económicas' },
  { id: 3, nombre: 'Psicología', facultad: 'Facultad de Ciencias Sociales y Humanas' },
]

export const estudiantesSeed: Estudiante[] = [
  { id: 1, codigo: '2021001', documento: '1001234567', nombres: 'Laura Camila', apellidos: 'Pérez Gómez', correo: 'laura.perez@correo.edu.co', programaId: 1, estado: 'ACTIVO' },
  { id: 2, codigo: '2021002', documento: '1002345678', nombres: 'Andrés Felipe', apellidos: 'Rodríguez Díaz', correo: 'andres.rodriguez@correo.edu.co', programaId: 1, estado: 'ACTIVO' },
  { id: 3, codigo: '2021003', documento: '1003456789', nombres: 'María José', apellidos: 'Herrera Castro', correo: 'maria.herrera@correo.edu.co', programaId: 2, estado: 'ACTIVO' },
  { id: 4, codigo: '2020004', documento: '1004567890', nombres: 'Juan David', apellidos: 'Martínez Ruiz', correo: 'juan.martinez@correo.edu.co', programaId: 2, estado: 'EGRESADO' },
  { id: 5, codigo: '2022005', documento: '1005678901', nombres: 'Valentina', apellidos: 'López Mendoza', correo: 'valentina.lopez@correo.edu.co', programaId: 3, estado: 'ACTIVO' },
  { id: 6, codigo: '2022006', documento: '1006789012', nombres: 'Santiago', apellidos: 'García Torres', correo: 'santiago.garcia@correo.edu.co', programaId: 3, estado: 'ACTIVO' },
  { id: 7, codigo: '2019007', documento: '1007890123', nombres: 'Daniela', apellidos: 'Ramírez Ortiz', correo: 'daniela.ramirez@correo.edu.co', programaId: 1, estado: 'EGRESADO' },
  { id: 8, codigo: '2023008', documento: '1008901234', nombres: 'Carlos Eduardo', apellidos: 'Suárez Vega', correo: 'carlos.suarez@correo.edu.co', programaId: 2, estado: 'ACTIVO' },
  { id: 9, codigo: '2023009', documento: '1009012345', nombres: 'Isabella', apellidos: 'Moreno Rojas', correo: 'isabella.moreno@correo.edu.co', programaId: 3, estado: 'ACTIVO' },
  { id: 10, codigo: '2021010', documento: '1010123456', nombres: 'Sebastián', apellidos: 'Jiménez Navarro', correo: 'sebastian.jimenez@correo.edu.co', programaId: 1, estado: 'INACTIVO' },
]

const asignaturasPorPrograma: Record<number, string[]> = {
  1: ['Programación I', 'Bases de Datos', 'Estructuras de Datos', 'Inteligencia Artificial', 'Ingeniería de Software'],
  2: ['Contabilidad General', 'Microeconomía', 'Mercadeo', 'Finanzas Corporativas', 'Gestión del Talento Humano'],
  3: ['Psicología General', 'Neurociencias', 'Psicología del Desarrollo', 'Estadística Aplicada', 'Psicometría'],
}

/** Genera 5 notas por estudiante de forma determinista (siempre las mismas). */
export const notasSeed: Nota[] = estudiantesSeed.flatMap((e, i) =>
  asignaturasPorPrograma[e.programaId].map((asignatura, j) => ({
    id: i * 5 + j + 1,
    estudianteId: e.id,
    asignatura,
    periodo: j < 3 ? '2025-1' : '2025-2',
    nota: Math.round((3 + ((e.id * 7 + j * 3) % 21) / 10) * 10) / 10,
    creditos: j % 2 === 0 ? 3 : 4,
  })),
)

export const tiposSeed: TipoCertificado[] = [
  { id: 1, clave: 'notas', nombre: 'Certificado de notas', tarifa: 25000 },
  { id: 2, clave: 'estudio', nombre: 'Certificado de estudio', tarifa: 18000 },
  { id: 3, clave: 'matricula', nombre: 'Certificado de matrícula', tarifa: 15000 },
  { id: 4, clave: 'paz_y_salvo', nombre: 'Paz y salvo académico', tarifa: 12000 },
]

export const pagosSeed: Pago[] = [
  { id: 1, referencia: '784512', valor: 25000, fecha: '2026-10-14', documentoPagador: '1001234567', banco: 'Bancolombia', usado: false },
  { id: 2, referencia: '784513', valor: 10000, fecha: '2026-10-14', documentoPagador: '1001234567', banco: 'Davivienda', usado: false },
  { id: 3, referencia: '784514', valor: 25000, fecha: '2026-09-30', documentoPagador: '1001234567', banco: 'Banco de Bogotá', usado: true },
  { id: 4, referencia: '784515', valor: 25000, fecha: '2026-10-15', documentoPagador: '1001234567', banco: 'BBVA', usado: false },
  { id: 5, referencia: '784516', valor: 18000, fecha: '2026-10-15', documentoPagador: '1002345678', banco: 'Nequi', usado: false },
  { id: 6, referencia: '784517', valor: 15000, fecha: '2026-10-16', documentoPagador: '1003456789', banco: 'Bancolombia', usado: false },
  { id: 7, referencia: '784518', valor: 12000, fecha: '2026-10-16', documentoPagador: '1004567890', banco: 'Banco de Occidente', usado: false },
  { id: 8, referencia: '784519', valor: 25000, fecha: '2026-10-17', documentoPagador: '1005678901', banco: 'Davivienda', usado: false },
  { id: 9, referencia: '784520', valor: 18000, fecha: '2026-10-17', documentoPagador: '1006789012', banco: 'PSE', usado: false },
  { id: 10, referencia: '784521', valor: 25000, fecha: '2026-10-18', documentoPagador: '1007890123', banco: 'Bancolombia', usado: false },
  { id: 11, referencia: '784522', valor: 25000, fecha: '2026-08-02', documentoPagador: '1008901234', banco: 'Banco Popular', usado: true },
  { id: 12, referencia: '784523', valor: 18000, fecha: '2026-08-11', documentoPagador: '1009012345', banco: 'Nequi', usado: true },
  { id: 13, referencia: '784524', valor: 15000, fecha: '2026-08-20', documentoPagador: '1002345678', banco: 'Davivienda', usado: true },
  { id: 14, referencia: '784525', valor: 12000, fecha: '2026-09-05', documentoPagador: '1003456789', banco: 'BBVA', usado: true },
  { id: 15, referencia: '784526', valor: 25000, fecha: '2026-10-19', documentoPagador: '1001234567', banco: 'Banco de Bogotá', usado: false },
]
