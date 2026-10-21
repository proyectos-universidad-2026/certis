import { beforeEach, describe, expect, it } from 'vitest'
import { esRecibo, obtenerMetricas } from '@/ia/clasificador'
import { recibosDemo, textoDeRecibo, textoHorario, type EscenarioId } from '@/ia/escenarios'
import { LocalDb } from '@/infrastructure/localDb'
import { crearRepositoriosLocales } from '@/infrastructure/repositories'
import { SolicitudService } from '@/services/solicitudService'

describe('clasificador ML', () => {
  it('distingue recibos de otros documentos', () => {
    expect(esRecibo(textoDeRecibo(recibosDemo[0].recibo!))).toBeGreaterThan(0.8)
    expect(esRecibo(textoHorario)).toBeLessThan(0.3)
  })
  it('cumple la meta F1 >= 0.85', () => expect(obtenerMetricas().f1).toBeGreaterThanOrEqual(0.85))
})

describe('flujo completo (los casos de la demo)', () => {
  let servicio: SolicitudService
  beforeEach(() => {
    servicio = new SolicitudService(crearRepositoriosLocales(new LocalDb(false)))
  })

  const solicitar = (escenario: EscenarioId, tipoId = 1) =>
    servicio.crear(
      { codigo: '2021001', documento: '1001234567', correo: 'laura@correo.edu.co', tipoId, archivo: new File(['x'], 'recibo.png', { type: 'image/png' }), escenario },
      undefined,
      0,
    )

  it.each([
    ['valido', 'APROBADA'],
    ['valor_menor', 'RECHAZADA'],
    ['usado', 'RECHAZADA'],
    ['no_recibo', 'RECHAZADA'],
    ['borroso', 'REVISION'],
    ['ref_inexistente', 'REVISION'],
    ['ia_caida', 'REVISION'],
  ] as const)('escenario %s → %s', async (escenario, esperado) => {
    const id = await solicitar(escenario)
    expect(servicio.detalle(id).solicitud.estado).toBe(esperado)
  })

  it('emite certificado verificable y no permite reutilizar el pago', async () => {
    const id = await solicitar('valido')
    const cert = servicio.detalle(id).certificado!
    expect(cert.codigoVerificacion).toMatch(/^CB-[A-Z0-9]{8}$/)
    expect(servicio.verificar(cert.codigoVerificacion)?.solicitud.id).toBe(id)
    const id2 = await solicitar('valido')
    expect(servicio.detalle(id2).solicitud.motivo).toContain('ya fue usado')
  })

  it('el funcionario puede aprobar una solicitud en revisión', async () => {
    const id = await solicitar('borroso')
    await servicio.revisar(id, true, 'Recibo verificado por teléfono con el banco')
    const d = servicio.detalle(id)
    expect(d.solicitud.estado).toBe('APROBADA')
    expect(d.solicitud.resueltoPor).toBe('FUNCIONARIO')
    expect(d.certificado).not.toBeNull()
  })

  it('valida que el estudiante exista', async () => {
    await expect(
      servicio.crear({ codigo: '999', documento: '1', correo: 'a@b.co', tipoId: 1, archivo: null, escenario: 'auto' }),
    ).rejects.toThrow('no existe')
  })
})
