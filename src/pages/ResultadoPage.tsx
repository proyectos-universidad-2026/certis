import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ExternalLink, Loader2, ShieldCheck, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { AnalisisIA } from '@/components/AnalisisIA'
import { EstadoBadge } from '@/components/EstadoBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { solicitudService } from '@/container'
import { cn, formatoFecha } from '@/lib/utils'

export async function descargarCertificado(solicitudId: number, codigo: string) {
  const blob = await solicitudService.descargarPdf(solicitudId)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `certificado_${codigo}.pdf`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const fondos = {
  APROBADA: 'from-emerald-500 to-teal-600',
  REVISION: 'from-amber-400 to-orange-500',
  RECHAZADA: 'from-rose-500 to-red-600',
  RECIBIDA: 'from-slate-400 to-slate-500',
}

export function ResultadoPage() {
  const { id } = useParams()
  const [descargando, setDescargando] = useState(false)
  let d
  try {
    d = solicitudService.detalle(Number(id))
  } catch {
    return (
      <div className="space-y-4 text-center">
        <p className="text-muted-foreground">La solicitud #{id} no existe.</p>
        <Button variant="outline" render={<Link to="/" />}>Volver</Button>
      </div>
    )
  }
  const { solicitud: s, certificado, tipo, estudiante } = d
  const segundos = s.fechaResolucion ? (new Date(s.fechaResolucion).getTime() - new Date(s.fechaCreacion).getTime()) / 1000 : null

  const descargar = async () => {
    if (!certificado) return
    setDescargando(true)
    try {
      await descargarCertificado(s.id, certificado.codigoVerificacion)
    } catch (e) {
      toast.error(String(e))
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Button variant="ghost" size="sm" render={<Link to="/" />}>
        <ArrowLeft /> Nueva solicitud
      </Button>

      <div className={cn('rounded-2xl bg-gradient-to-br p-6 text-white shadow-lg', fondos[s.estado])}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm opacity-90">Solicitud #{s.id} · {tipo.nombre}</p>
            <h1 className="text-2xl font-bold">
              {s.estado === 'APROBADA' && '¡Tu certificado está listo!'}
              {s.estado === 'REVISION' && 'Tu solicitud pasó a revisión manual'}
              {s.estado === 'RECHAZADA' && 'Tu solicitud fue rechazada'}
            </h1>
            <p className="max-w-2xl text-sm opacity-95">{s.motivo}</p>
          </div>
          <EstadoBadge estado={s.estado} className="bg-white/90 ring-white" />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm opacity-95">
          <span>{estudiante.nombres} {estudiante.apellidos}</span>
          {segundos !== null && (
            <span className="flex items-center gap-1">
              <Timer className="size-4" /> Resuelto en {segundos.toFixed(1)} s (antes: 15 días hábiles)
            </span>
          )}
        </div>
        {certificado && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={descargar} disabled={descargando} className="bg-white text-emerald-700 hover:bg-white/90">
              {descargando ? <Loader2 className="animate-spin" /> : <Download />} Descargar PDF
            </Button>
            <Button variant="outline" className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white" render={<Link to={`/verificar/${certificado.codigoVerificacion}`} />}>
              <ShieldCheck /> Verificar {certificado.codigoVerificacion}
            </Button>
          </div>
        )}
      </div>

      {s.analisis ? (
        <Card>
          <CardHeader>
            <CardTitle>Lo que entendió la IA</CardTitle>
            <CardDescription>La IA interpreta el recibo; las reglas toman la decisión.</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalisisIA analisis={s.analisis} mostrarTexto />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-sm text-muted-foreground">No hay análisis de IA para esta solicitud (el servicio no respondió).</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Trazabilidad</CardTitle>
          <CardDescription>Registro de eventos (log_eventos)</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-4 border-l pl-5">
            {d.eventos.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-indigo-500 ring-4 ring-background" />
                <p className="font-mono text-xs font-semibold">{e.evento}</p>
                <p className="text-sm text-muted-foreground">{e.detalle}</p>
                <p className="text-xs text-muted-foreground/70">{formatoFecha(e.fecha)}</p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {s.estado === 'REVISION' && (
        <p className="text-center text-sm text-muted-foreground">
          Puedes simular la decisión del funcionario en el{' '}
          <Link to="/admin" className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline">
            panel administrativo <ExternalLink className="size-3.5" />
          </Link>
        </p>
      )}
    </div>
  )
}
