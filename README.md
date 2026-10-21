# CertiBot: prototipo funcional

Es un sistema inteligente que emite certificados académicos automáticamente. Esta es la **primera versión funcional** y corre **100 % en el navegador** (React + TypeScript), sin backend.

> **Problema:** hoy, para pedir un certificado, el estudiante paga, sube el recibo y espera **hasta 15 días hábiles** mientras alguien revisa el recibo y genera el documento a mano.
> **Solución:** CertiBot lee el recibo, lo valida contra los pagos registrados y, si todo coincide, emite el **PDF con código QR en segundos**. Si tiene dudas, manda la solicitud a revisión humana.

## Qué es real y qué está simulado

| Parte | En este prototipo |
|---|---|
| Formulario, validaciones (campos, correo, estudiante, tipo y tamaño de archivo) | ✅ Real |
| **OCR** (leer el texto de la imagen) | 🟡 **Simulado**: devuelve el texto del recibo de demostración, con ruido y una confianza realista |
| **Extracción de campos** (regex: referencia, valor, fecha, documento, banco) + limpieza (`$ 25.000,00` → `25000`) | ✅ Real |
| **Clasificador ML** recibo / no recibo (TF-IDF + Regresión Logística, entrenado en el navegador) | ✅ Real |
| **Puntaje de confianza** (OCR + clasificador + coincidencia de campos) | ✅ Real |
| **Motor de reglas** (aprobar / revisión / rechazar) | ✅ Real |
| Certificado **PDF con QR** y código de verificación, firma (hash SHA-256) | ✅ Real (la firma es simulada) |
| Base de datos | 🟡 Simulada: tablas en `localStorage` mediante el patrón Repository |
| Correos | 🟡 Simulados: se guardan en la bandeja del panel admin |
| Servicio de IA caído | 🟡 Se puede simular desde el formulario (escenario 8) |

## Cómo ejecutarlo

Requisito: **Node.js 20 o superior** (https://nodejs.org).

```bash
npm install
npm run dev
```

Luego abre **http://localhost:5173**.

| Comando | Para qué sirve |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas unitarias y de integración (Vitest) |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve la versión compilada |

## Guion rápido de la demo

1. Entra a **Recibos demo** y pulsa **"Usar en el formulario"** en el *Recibo válido*. Se llenan los datos de la estudiante de prueba (código `2021001`, cédula `1001234567`).
2. En **Solicitar**, pulsa **Enviar solicitud**. Verás los 5 pasos de la IA y luego el resultado **Aprobada**, con el PDF descargable.
3. Pulsa **Verificar CB-XXXXXXXX**: es la página pública a la que lleva el QR.
4. Repite con los otros recibos:

| # | Recibo | Resultado | Regla que se dispara |
|---|---|---|---|
| 1 | Recibo válido (784512) | ✅ Aprobada | R10: todo coincide |
| 2 | Valor menor ($10.000) | ❌ Rechazada (faltan $15.000) | R7: valor insuficiente |
| 3 | Ya usado (784514) | ❌ Rechazada (posible fraude) | R6: duplicado |
| 4 | Horario de clases | ❌ Rechazada | R3: el clasificador dice que no es recibo |
| 5 | Foto borrosa | 👁 Revisión manual | R2: OCR < 60 % |
| 6 | Referencia no registrada (990001) | 👁 Revisión manual | R5: la referencia no existe en pagos |
| 7 | Otro recibo válido (784526) | ✅ Aprobada | R10 |
| 8 | Servicio de IA caído (escenario) | 👁 Revisión manual | Degradación controlada |

5. En **Panel admin** puedes ver las métricas (automatización, tiempo de emisión), la **cola de revisión** (abrir, ver el recibo y el análisis de la IA, y aprobar o rechazar), la tabla `pagos`, la bandeja de correos y las métricas del modelo (F1 y matriz de confusión).
6. **Reiniciar datos demo** restaura los pagos y borra las solicitudes antes de presentar.

También puedes subir **tu propio archivo** (PDF/JPG/PNG ≤ 5 MB). Como no hay OCR real, el sistema simula un recibo con un pago pendiente del estudiante. Si el nombre del archivo contiene `borroso`, `usado`, `menor` u `horario`, se aplica ese escenario. También se puede forzar cualquier escenario con el selector del formulario.

## Arquitectura

```
[Usuario] → [Páginas React] → [Stores Zustand] → [SolicitudService]
                                                   ├── Servicio IA: OCR (simulado) → extractor → clasificador ML → confianza
                                                   ├── Motor de reglas: APROBADA | REVISION | RECHAZADA
                                                   ├── CertificadoService: PDF + QR + firma
                                                   ├── Notificador: correo simulado
                                                   └── Repositorios (interfaces) ← implementación localStorage
```

**Patrón Repository:** los servicios dependen solo de las interfaces de `src/domain/repositories.ts`. La implementación concreta se elige en `src/container.ts`. Para conectar un backend real (Node/Express + PostgreSQL, por ejemplo) basta con escribir repositorios HTTP que cumplan esas interfaces, sin tocar los servicios ni la interfaz.

**Principio de diseño:** *la IA interpreta, las reglas deciden.* La IA nunca emite un certificado por sí sola y, ante la duda, escala a un humano.

```
src/
├── domain/              Entidades y contratos de repositorios
├── data/seed.ts         Datos semilla: 10 estudiantes, 3 programas, 50 notas, 4 tarifas, 15 pagos (5 usados)
├── infrastructure/      LocalDb (localStorage) + implementaciones de los repositorios
├── ia/                  escenarios, ocrSimulado, extractor, dataset, clasificador, confianza, servicioIA
├── reglas/motor.ts      Motor de reglas determinista (R1…R10)
├── services/            SolicitudService (caso de uso), CertificadoService (PDF), Notificador
├── stores/              Zustand: useSolicitudStore, useAdminStore
├── pages/               Solicitar, Resultado, RecibosDemo, Verificar, Admin
├── components/          Layout, AnalisisIA, EstadoBadge, recibos (SVG → PNG) y ui/ (shadcn)
└── container.ts         Inyección de dependencias
tests/                   extractor, motor de reglas, clasificador y flujo completo (30 pruebas)
```

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, shadcn/ui (Base UI), Zustand, React Router, jsPDF, qrcode, lucide-react y Vitest.

## Reglas de negocio (motor)

| Regla | Condición | Resultado |
|---|---|---|
| R1 | Texto leído < 20 caracteres | Rechazada (subir otra foto) |
| R2 | Confianza del OCR < 60 % | Revisión manual |
| R3 | Probabilidad de recibo < 60 % | Rechazada (no es un recibo) |
| R4 | No se encontró la referencia | Revisión manual |
| R5 | La referencia no existe en `pagos` | Revisión manual |
| R6 | El pago ya fue usado | Rechazada (posible fraude) |
| R7 | Valor del pago < tarifa | Rechazada (indica cuánto falta) |
| R8 | El valor leído ≠ el valor registrado | Revisión manual (posible alteración) |
| R9 | Confianza global < 80 % | Revisión manual |
| R10 | Todo lo anterior se cumple | **Aprobada**: PDF + QR, pago marcado como usado, correo |

Además, una solicitud que lleva más de 24 h en revisión aparece como **escalada** en el panel.

## Trabajo futuro

Backend con OCR real (Tesseract o EasyOCR), base de datos relacional, integración con la pasarela de pagos (PSE) y con el sistema académico, firma digital certificada, autenticación del panel administrativo, correo real por SMTP y detección de recibos alterados.
