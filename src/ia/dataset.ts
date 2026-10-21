/**
 * Dataset sintético para entrenar el clasificador "recibo / no recibo".
 * Se genera con plantillas y una semilla fija (siempre produce los mismos ejemplos)
 * e incluye ruido tipo OCR para que el modelo no dependa de texto perfecto.
 */

export interface Ejemplo {
  texto: string
  etiqueta: 0 | 1 // 1 = recibo de pago
}

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(semilla: number) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const bancos = ['BANCOLOMBIA', 'DAVIVIENDA', 'BANCO DE BOGOTÁ', 'BBVA', 'NEQUI', 'BANCO POPULAR', 'PSE', 'EFECTY', 'BANCO DE OCCIDENTE']
const titulos = ['COMPROBANTE DE PAGO', 'RECIBO DE CAJA', 'CONSTANCIA DE TRANSACCIÓN', 'Comprobante de pago PSE', 'SOPORTE DE CONSIGNACIÓN', 'Recibo de pago en línea']
const etiquetasRef = ['Referencia de pago', 'Ref.', 'Número de referencia', 'Código de pago', 'No. de transacción']
const etiquetasValor = ['Valor pagado', 'Total', 'Valor', 'Monto', 'Importe total']
const conceptos = ['Certificado académico', 'Derechos pecuniarios', 'Certificado de notas', 'Paz y salvo', 'Servicios académicos']

const noRecibos = [
  'HORARIO DE CLASES lunes 7:00 programación aula 204 martes bases de datos laboratorio miércoles inteligencia artificial',
  'ACTA DE REUNIÓN comité curricular asistentes orden del día aprobación del acta anterior varios compromisos',
  'LISTA DE ASISTENCIA taller de investigación nombre firma código estudiantil fecha del taller salón',
  'RECETA arroz con coco ingredientes taza de arroz leche de coco azúcar sal preparación cocinar a fuego lento',
  'CONVOCATORIA becas de excelencia académica requisitos promedio mínimo inscripciones abiertas hasta el viernes',
  'APUNTES DE CLASE la regresión logística estima probabilidades mediante la función sigmoide y el descenso del gradiente',
  'CARTA DE PRESENTACIÓN señores empresa cordial saludo me permito presentar mi hoja de vida para la vacante',
  'MENÚ DE LA CAFETERÍA desayuno almuerzo ejecutivo sopa del día jugo natural postre bebidas calientes',
  'EVENTO semana cultural concierto en el auditorio exposición de arte torneo deportivo inscríbete',
  'REGLAMENTO ESTUDIANTIL artículo deberes del estudiante derechos sanciones disciplinarias valores institucionales',
  'PLAN DE ESTUDIOS semestre uno cálculo diferencial álgebra lineal programación créditos académicos prerrequisitos',
  'MENSAJE hola profe le envío el trabajo final del grupo quedo atento a sus comentarios gracias',
  'CRONOGRAMA del proyecto semana uno requisitos semana dos diseño de base de datos semana tres desarrollo',
  'CERTIFICADO DE PARTICIPACIÓN se otorga a por su asistencia al seminario de inteligencia artificial',
  'NOTICIA la universidad inauguró el nuevo laboratorio de robótica con capacidad para cuarenta estudiantes',
  'INSTRUCCIONES DEL EXAMEN lea cuidadosamente cada pregunta no se permite el uso de celulares duración dos horas',
  'POEMA el mar y la arena cantan juntos bajo la luna que ilumina el camino de regreso',
  'FICHA MÉDICA nombre edad tipo de sangre alergias contacto de emergencia EPS',
  'INVITACIÓN cumpleaños sábado a las cuatro de la tarde trae tu mejor disfraz habrá torta y música',
  'MANUAL DE USUARIO encienda el equipo presione el botón de inicio configure la red wifi',
  'HOJA DE VIDA perfil profesional experiencia laboral formación académica idiomas referencias personales',
  'ANUNCIO se arrienda apartamento dos habitaciones cerca de la universidad informes al celular',
  'PROTOCOLO DE LABORATORIO usar bata guantes gafas de seguridad desechar residuos en el contenedor',
  'HORARIO lunes 7:00 a 9:00 cálculo aula 305 martes 9:00 a 11:00 física laboratorio 2 jueves 14:00 química bloque C',
  'CALENDARIO ACADÉMICO inicio de clases 3 de agosto parciales 14 de septiembre finales 30 de noviembre vacaciones 15 de diciembre',
  'TALLER 2 ejercicio 1 resolver 3x + 5 = 20 ejercicio 2 calcular la derivada de x elevado a 2 ejercicio 3 graficar',
  'RESUMEN DEL LIBRO capítulo uno el protagonista llega a la ciudad y conoce a sus nuevos compañeros',
]

const RUIDO: Record<string, string> = { o: '0', l: '1', e: 'c', a: 'o', s: '5', i: 'l' }

function conRuido(texto: string, r: () => number, nivel: number) {
  return [...texto]
    .map((c) => {
      const x = r()
      if (x < nivel / 2 && RUIDO[c]) return RUIDO[c]
      if (x < nivel) return ''
      return c
    })
    .join('')
}

const elegir = <T,>(arr: T[], r: () => number) => arr[Math.floor(r() * arr.length)]

export function generarDataset(semilla = 2026): Ejemplo[] {
  const r = rng(semilla)
  const datos: Ejemplo[] = []

  for (let i = 0; i < 30; i++) {
    const valor = (10 + Math.floor(r() * 40)) * 1000
    const texto = [
      elegir(bancos, r),
      elegir(titulos, r),
      r() > 0.5 ? 'Transacción exitosa' : 'Pago aprobado',
      `${elegir(etiquetasRef, r)}: ${100000 + Math.floor(r() * 899999)}`,
      `${elegir(etiquetasValor, r)}: $ ${valor.toLocaleString('es-CO')}${r() > 0.5 ? ',00' : ''}`,
      `Fecha: ${1 + Math.floor(r() * 28)}/${1 + Math.floor(r() * 12)}/2026`,
      `Documento: C.C. ${1000000000 + Math.floor(r() * 99999999)}`,
      `Concepto: ${elegir(conceptos, r)}`,
      r() > 0.5 ? 'Conserve este comprobante' : 'Estado: APROBADO',
    ].join('\n')
    datos.push({ texto: conRuido(texto, r, r() > 0.5 ? 0.06 : 0), etiqueta: 1 })
  }

  noRecibos.forEach((base, i) => {
    const extra = i % 3 === 0 ? ` fecha ${1 + (i % 28)}/10/2026 número ${300 + i}` : ''
    datos.push({ texto: conRuido(base + extra, r, i % 2 ? 0.05 : 0), etiqueta: 0 })
  })

  return datos
}
