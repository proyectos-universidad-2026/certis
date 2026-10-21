import { CheckCircle2, Clock, Eye, XCircle } from 'lucide-react'
import type { EstadoSolicitud } from '@/domain/entities'
import { cn } from '@/lib/utils'

const estilos: Record<EstadoSolicitud, { texto: string; clase: string; Icono: typeof Clock }> = {
  APROBADA: { texto: 'Aprobada', clase: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900', Icono: CheckCircle2 },
  REVISION: { texto: 'En revisión manual', clase: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900', Icono: Eye },
  RECHAZADA: { texto: 'Rechazada', clase: 'bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900', Icono: XCircle },
  RECIBIDA: { texto: 'Recibida', clase: 'bg-slate-100 text-slate-700 ring-slate-200', Icono: Clock },
}

export function EstadoBadge({ estado, className }: { estado: EstadoSolicitud; className?: string }) {
  const { texto, clase, Icono } = estilos[estado]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1', clase, className)}>
      <Icono className="size-3.5" />
      {texto}
    </span>
  )
}
