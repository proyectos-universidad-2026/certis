/** Muestra la interpretación de la IA: probabilidades, campos extraídos y razonamiento. */
import { Brain, FileText } from 'lucide-react'
import type { AnalisisIA as Analisis } from '@/domain/entities'
import { cn, formatoPesos } from '@/lib/utils'
import { UMBRALES } from '@/reglas/motor'

function Medidor({ etiqueta, valor, umbral }: { etiqueta: string; valor: number; umbral: number }) {
  const ok = valor >= umbral
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted-foreground">{etiqueta}</span>
        <span className={cn('font-semibold tabular-nums', ok ? 'text-emerald-600' : 'text-amber-600')}>{Math.round(valor * 100)} %</span>
      </div>
      <div className="relative h-2 rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', ok ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${valor * 100}%` }} />
        <div className="absolute -top-1 h-4 w-0.5 bg-foreground/40" style={{ left: `${umbral * 100}%` }} title={`Umbral ${umbral * 100} %`} />
      </div>
    </div>
  )
}

export function AnalisisIA({ analisis, mostrarTexto = false }: { analisis: Analisis; mostrarTexto?: boolean }) {
  const { campos } = analisis
  const filas: [string, string | null][] = [
    ['Referencia', campos.referencia],
    ['Valor', campos.valor !== null ? formatoPesos(campos.valor) : null],
    ['Fecha', campos.fecha],
    ['Documento', campos.documento],
    ['Banco', campos.banco],
  ]
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Medidor etiqueta="Confianza del OCR" valor={analisis.ocrConfianza} umbral={UMBRALES.ocr} />
        <Medidor etiqueta="¿Es un recibo?" valor={analisis.probRecibo} umbral={UMBRALES.recibo} />
        <Medidor etiqueta="Confianza global" valor={analisis.confianza} umbral={UMBRALES.confianza} />
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
        <div className="mb-1 flex items-center gap-1.5 font-medium">
          <Brain className="size-4 text-primary" /> Razonamiento del sistema
        </div>
        <p className="text-muted-foreground italic">“{analisis.razonamiento}”</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
        {filas.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className={cn('font-mono font-medium', !v && 'text-muted-foreground')}>{v ?? 'no encontrado'}</dd>
          </div>
        ))}
      </dl>

      {mostrarTexto && (
        <details className="text-sm">
          <summary className="flex cursor-pointer items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <FileText className="size-4" /> Texto leído por el OCR
          </summary>
          <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">{analisis.textoOcr}</pre>
        </details>
      )}
    </div>
  )
}
