import { describe, expect, it } from 'vitest'
import type { Pago } from '@/domain/entities'
import { evaluar, type EntradaMotor } from '@/reglas/motor'

const pago: Pago = { id: 1, referencia: '784512', valor: 25000, fecha: '2026-10-14', documentoPagador: '1', banco: 'X', usado: false }
const base: EntradaMotor = {
  texto: 'BANCOLOMBIA comprobante de pago referencia 784512 valor 25000',
  ocrConfianza: 0.95,
  probRecibo: 0.95,
  campos: { referencia: '784512', valor: 25000, fecha: '2026-10-14', documento: '1', banco: 'Bancolombia' },
  pago,
  tarifa: 25000,
  confianza: 0.95,
}

describe('motor de reglas', () => {
  it('aprueba cuando todo coincide', () => expect(evaluar(base).estado).toBe('APROBADA'))
  it('rechaza texto ilegible', () => expect(evaluar({ ...base, texto: '..' }).regla).toBe('R1_ILEGIBLE'))
  it('envía a revisión si el OCR es bajo', () => expect(evaluar({ ...base, ocrConfianza: 0.4 }).estado).toBe('REVISION'))
  it('rechaza si no es recibo', () => expect(evaluar({ ...base, probRecibo: 0.2 }).regla).toBe('R3_NO_RECIBO'))
  it('revisión si la referencia no existe', () => expect(evaluar({ ...base, pago: null }).regla).toBe('R5_REF_NO_EXISTE'))
  it('rechaza pagos usados (duplicado)', () => {
    const d = evaluar({ ...base, pago: { ...pago, usado: true } })
    expect(d.regla).toBe('R6_DUPLICADO')
    expect(d.posibleFraude).toBe(true)
  })
  it('rechaza e indica cuánto falta', () => {
    const d = evaluar({ ...base, pago: { ...pago, valor: 10000 } })
    expect(d.regla).toBe('R7_VALOR_INSUFICIENTE')
    expect(d.motivo).toContain('15.000')
  })
  it('revisión si el valor leído no coincide', () => expect(evaluar({ ...base, campos: { ...base.campos, valor: 90000 } }).regla).toBe('R8_VALOR_NO_COINCIDE'))
  it('revisión si la confianza es menor a 0.80', () => expect(evaluar({ ...base, confianza: 0.7 }).regla).toBe('R9_CONFIANZA_BAJA'))
})
