/**
 * Clasificador de documentos "¿es un recibo de pago?"
 * Modelo de Machine Learning: TF-IDF + Regresión Logística, implementado desde cero
 * (equivale a TfidfVectorizer + LogisticRegression de scikit-learn).
 * Se entrena en el navegador con el dataset sintético en pocos milisegundos.
 */
import { generarDataset, rng, type Ejemplo } from './dataset'

export interface Modelo {
  vocab: Map<string, number>
  idf: number[]
  pesos: number[]
  sesgo: number
}

export interface Metricas {
  exactitud: number
  precision: number
  recall: number
  f1: number
  matriz: { vp: number; fp: number; vn: number; fn: number }
  entrenamiento: number
  prueba: number
}

export function tokenizar(texto: string): string[] {
  const palabras = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\d+/g, ' num ')
    .split(/[^a-z]+/)
    .filter((t) => t.length >= 2)
  // Los números se conservan solo como contexto en bigramas ("referencia_num"), no como palabra suelta.
  const unigramas = palabras.filter((t) => t !== 'num')
  // Unigramas + bigramas para capturar frases como "valor pagado".
  const bigramas = palabras.slice(1).map((p, i) => `${palabras[i]}_${p}`)
  return [...unigramas, ...bigramas]
}

function vectorizar(tokens: string[], modelo: Pick<Modelo, 'vocab' | 'idf'>): Map<number, number> {
  const tf = new Map<number, number>()
  for (const t of tokens) {
    const idx = modelo.vocab.get(t)
    if (idx !== undefined) tf.set(idx, (tf.get(idx) ?? 0) + 1)
  }
  let norma = 0
  for (const [i, f] of tf) {
    const v = f * modelo.idf[i]
    tf.set(i, v)
    norma += v * v
  }
  norma = Math.sqrt(norma) || 1
  for (const [i, v] of tf) tf.set(i, v / norma)
  return tf
}

const sigmoide = (z: number) => 1 / (1 + Math.exp(-z))

export function entrenar(datos: Ejemplo[], epocas = 400, tasa = 1.5, lambda = 0.001): Modelo {
  const docs = datos.map((d) => tokenizar(d.texto))
  const vocab = new Map<string, number>()
  const df: number[] = []
  for (const tokens of docs) {
    for (const t of new Set(tokens)) {
      if (!vocab.has(t)) {
        vocab.set(t, vocab.size)
        df.push(0)
      }
      df[vocab.get(t)!]++
    }
  }
  const idf = df.map((f) => Math.log((1 + docs.length) / (1 + f)) + 1)
  const X = docs.map((tokens) => vectorizar(tokens, { vocab, idf }))
  const pesos = new Array(vocab.size).fill(0)
  let sesgo = 0

  // Descenso del gradiente por lotes con regularización L2.
  for (let e = 0; e < epocas; e++) {
    const grad = new Array(vocab.size).fill(0)
    let gradSesgo = 0
    X.forEach((x, k) => {
      let z = sesgo
      for (const [i, v] of x) z += pesos[i] * v
      const error = sigmoide(z) - datos[k].etiqueta
      for (const [i, v] of x) grad[i] += error * v
      gradSesgo += error
    })
    for (let i = 0; i < pesos.length; i++) pesos[i] -= tasa * (grad[i] / X.length + lambda * pesos[i])
    sesgo -= tasa * (gradSesgo / X.length)
  }
  return { vocab, idf, pesos, sesgo }
}

/** Probabilidad (0..1) de que el texto sea un recibo de pago. */
export function predecir(modelo: Modelo, texto: string): number {
  const x = vectorizar(tokenizar(texto), modelo)
  if (x.size === 0) return 0
  let z = modelo.sesgo
  for (const [i, v] of x) z += modelo.pesos[i] * v
  return sigmoide(z)
}

/** Evalúa el modelo con una partición estratificada 75 % / 25 %. */
export function evaluar(datos: Ejemplo[], umbral = 0.5): Metricas {
  const r = rng(7)
  const mezclar = (arr: Ejemplo[]) => [...arr].sort(() => r() - 0.5)
  const pos = mezclar(datos.filter((d) => d.etiqueta === 1))
  const neg = mezclar(datos.filter((d) => d.etiqueta === 0))
  const corte = (a: Ejemplo[]) => Math.round(a.length * 0.75)
  const train = [...pos.slice(0, corte(pos)), ...neg.slice(0, corte(neg))]
  const test = [...pos.slice(corte(pos)), ...neg.slice(corte(neg))]

  const modelo = entrenar(train)
  const matriz = { vp: 0, fp: 0, vn: 0, fn: 0 }
  for (const d of test) {
    const pred = predecir(modelo, d.texto) >= umbral ? 1 : 0
    if (pred === 1 && d.etiqueta === 1) matriz.vp++
    else if (pred === 1) matriz.fp++
    else if (d.etiqueta === 0) matriz.vn++
    else matriz.fn++
  }
  const precision = matriz.vp / (matriz.vp + matriz.fp || 1)
  const recall = matriz.vp / (matriz.vp + matriz.fn || 1)
  return {
    exactitud: (matriz.vp + matriz.vn) / test.length,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall || 1),
    matriz,
    entrenamiento: train.length,
    prueba: test.length,
  }
}

let modeloCache: Modelo | null = null
let metricasCache: Metricas | null = null

/** Modelo entrenado con todo el dataset (se entrena una sola vez). */
export function obtenerModelo(): Modelo {
  modeloCache ??= entrenar(generarDataset())
  return modeloCache
}

export function obtenerMetricas(): Metricas {
  metricasCache ??= evaluar(generarDataset())
  return metricasCache
}

export const esRecibo = (texto: string) => predecir(obtenerModelo(), texto)
