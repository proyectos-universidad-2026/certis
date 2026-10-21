import { describe, expect, it } from 'vitest'
import { extraerCampos, limpiarReferencia, normalizarFecha, normalizarValor } from '@/ia/extractor'
import { recibosDemo, textoDeRecibo } from '@/ia/escenarios'

describe('limpieza de datos', () => {
  it.each([
    ['$ 25.000,00', 25000],
    ['25.000', 25000],
    ['25,000.50', 25001],
    ['18000', 18000],
    ['$1.250.000', 1250000],
  ])('normalizarValor(%s) = %d', (entrada, esperado) => {
    expect(normalizarValor(entrada)).toBe(esperado)
  })

  it('normaliza fechas a ISO', () => {
    expect(normalizarFecha('14/10/2026')).toBe('2026-10-14')
    expect(normalizarFecha('2026-10-14')).toBe('2026-10-14')
    expect(normalizarFecha('3 de octubre de 2026')).toBe('2026-10-03')
    expect(normalizarFecha('99/99/2026')).toBeNull()
  })

  it('limpia referencias', () => {
    expect(limpiarReferencia('78 45-12')).toBe('784512')
  })
})

describe('extraerCampos', () => {
  it('extrae todos los campos del recibo válido', () => {
    const campos = extraerCampos(textoDeRecibo(recibosDemo[0].recibo!))
    expect(campos).toEqual({ referencia: '784512', valor: 25000, fecha: '2026-10-14', documento: '1001234567', banco: 'Bancolombia' })
  })

  it('devuelve null cuando no hay datos', () => {
    expect(extraerCampos('Horario de clases lunes').referencia).toBeNull()
  })
})
