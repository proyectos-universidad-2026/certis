import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Bot, CheckCircle2, Clock, Download, Eye, FileCheck2, Mail, RotateCcw, Timer, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { AnalisisIA } from '@/components/AnalisisIA'
import { EstadoBadge } from '@/components/EstadoBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import type { EstadoSolicitud } from '@/domain/entities'
import { obtenerMetricas } from '@/ia/clasificador'
import { cn, formatoFecha, formatoPesos, porcentaje } from '@/lib/utils'
import type { DetalleSolicitud } from '@/services/solicitudService'
import { useAdminStore } from '@/stores/useAdminStore'
import { descargarCertificado } from './ResultadoPage'

function Kpi({ titulo, valor, detalle, Icono, tono }: { titulo: string; valor: string; detalle: string; Icono: typeof Clock; tono: string }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start gap-3">
        <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', tono)}>
          <Icono className="size-5" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{titulo}</p>
          <p className="text-2xl font-bold tabular-nums">{valor}</p>
          <p className="text-xs text-muted-foreground">{detalle}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function DialogoRevision({ detalle, onCerrar }: { detalle: DetalleSolicitud | null; onCerrar: () => void }) {
  const revisar = useAdminStore((s) => s.revisar)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  if (!detalle) return null
  const s = detalle.solicitud
  const enRevision = s.estado === 'REVISION'

  const decidir = async (aprobar: boolean) => {
    setEnviando(true)
    try {
      await revisar(s.id, aprobar, comentario)
      toast.success(`Solicitud #${s.id} ${aprobar ? 'aprobada' : 'rechazada'} manualmente`)
      setComentario('')
      onCerrar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Solicitud #{s.id} <EstadoBadge estado={s.estado} />
          </DialogTitle>
          <DialogDescription>
            {detalle.estudiante.nombres} {detalle.estudiante.apellidos} ({detalle.estudiante.codigo}) · {detalle.tipo.nombre} ·{' '}
            {formatoPesos(detalle.tipo.tarifa)}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[200px_1fr]">
          <div className="space-y-2">
            {s.archivoPreview ? (
              <img src={s.archivoPreview} alt="Recibo" className="w-full rounded-md border shadow-sm" />
            ) : (
              <div className="grid aspect-[4/5] place-items-center rounded-md border bg-muted text-xs text-muted-foreground">Sin vista previa</div>
            )}
            <p className="truncate text-xs text-muted-foreground">{s.archivoNombre}</p>
          </div>
          <div className="space-y-4">
            {s.motivo && (
              <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{s.motivo}</p>
            )}
            {s.analisis ? <AnalisisIA analisis={s.analisis} mostrarTexto /> : <p className="text-sm text-muted-foreground">Sin análisis de IA.</p>}
            {detalle.pago && (
              <p className="text-sm">
                Pago registrado: <b>{detalle.pago.referencia}</b> · {formatoPesos(detalle.pago.valor)} · {detalle.pago.banco} ·{' '}
                {detalle.pago.usado ? 'usado' : 'sin usar'}
              </p>
            )}
          </div>
        </div>
        {enRevision && (
          <>
            <Textarea placeholder="Comentario del funcionario (opcional)" value={comentario} onChange={(e) => setComentario(e.target.value)} />
            <DialogFooter>
              <Button variant="destructive" disabled={enviando} onClick={() => decidir(false)}>
                <XCircle /> Rechazar
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={enviando} onClick={() => decidir(true)}>
                <CheckCircle2 /> Aprobar y emitir
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

const filtros: (EstadoSolicitud | 'TODAS')[] = ['TODAS', 'REVISION', 'APROBADA', 'RECHAZADA']
const nombreFiltro = { TODAS: 'Todas', REVISION: 'Cola de revisión', APROBADA: 'Aprobadas', RECHAZADA: 'Rechazadas', RECIBIDA: 'Recibidas' }

export function AdminPage() {
  const { solicitudes, metricas, pagos, correos, filtro, refrescar, setFiltro, reiniciarDemo } = useAdminStore()
  const [seleccion, setSeleccion] = useState<DetalleSolicitud | null>(null)
  const [confirmarReinicio, setConfirmarReinicio] = useState(false)
  const modelo = obtenerMetricas()

  useEffect(() => {
    refrescar()
  }, [refrescar])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Panel administrativo</h1>
          <p className="text-muted-foreground">Oficina de Registro y Control Académico</p>
        </div>
        {confirmarReinicio ? (
          <div className="flex items-center gap-2 text-sm">
            ¿Borrar solicitudes y restaurar los pagos?
            <Button size="sm" variant="destructive" onClick={() => { reiniciarDemo(); setConfirmarReinicio(false); toast.success('Datos de demostración restaurados') }}>
              Sí, reiniciar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setConfirmarReinicio(false)}>Cancelar</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirmarReinicio(true)}>
            <RotateCcw /> Reiniciar datos demo
          </Button>
        )}
      </div>

      {metricas && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi titulo="Solicitudes" valor={String(metricas.total)} detalle={`${metricas.certificadosEmitidos} certificados emitidos`} Icono={FileCheck2} tono="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300" />
          <Kpi titulo="Automatización" valor={porcentaje(metricas.tasaAutomatizacion)} detalle="Resueltas sin intervención humana (meta ≥ 70 %)" Icono={Bot} tono="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" />
          <Kpi titulo="Enviadas a revisión" valor={porcentaje(metricas.tasaRevision)} detalle={`${metricas.porEstado.REVISION} en cola · ${metricas.escaladas} escaladas (> 24 h)`} Icono={Eye} tono="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" />
          <Kpi titulo="Tiempo promedio de emisión" valor={metricas.tiempoPromedioSeg === null ? '—' : `${metricas.tiempoPromedioSeg.toFixed(1)} s`} detalle="Meta < 2 min · antes 15 días hábiles" Icono={Timer} tono="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" />
        </div>
      )}

      <Tabs defaultValue="solicitudes">
        <TabsList>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="pagos">Pagos registrados</TabsTrigger>
          <TabsTrigger value="correos">Correos ({correos.length})</TabsTrigger>
          <TabsTrigger value="modelo">Modelo IA</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitudes">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap gap-1.5">
                {filtros.map((f) => (
                  <Button key={f} size="sm" variant={filtro === f ? 'default' : 'outline'} onClick={() => setFiltro(f)}>
                    {nombreFiltro[f]}
                    {f === 'REVISION' && metricas?.porEstado.REVISION ? (
                      <span className="ml-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-white">{metricas.porEstado.REVISION}</span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {solicitudes.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No hay solicitudes. <Link to="/" className="text-indigo-600 hover:underline">Crea una</Link> para verlas aquí.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Estudiante</TableHead>
                        <TableHead>Certificado</TableHead>
                        <TableHead>Confianza IA</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {solicitudes.map((d) => (
                        <TableRow key={d.solicitud.id}>
                          <TableCell className="font-mono">{d.solicitud.id}</TableCell>
                          <TableCell>
                            <div className="font-medium">{d.estudiante.nombres} {d.estudiante.apellidos}</div>
                            <div className="text-xs text-muted-foreground">{d.estudiante.codigo}</div>
                          </TableCell>
                          <TableCell>{d.tipo.nombre}</TableCell>
                          <TableCell className="tabular-nums">{porcentaje(d.solicitud.analisis?.confianza)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <EstadoBadge estado={d.solicitud.estado} />
                              {d.escalada && <AlertTriangle className="size-4 text-rose-500" aria-label="Escalada (> 24 h)" />}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatoFecha(d.solicitud.fechaCreacion)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {d.certificado && (
                                <Button size="icon-sm" variant="ghost" aria-label="Descargar PDF" onClick={() => descargarCertificado(d.solicitud.id, d.certificado!.codigoVerificacion)}>
                                  <Download />
                                </Button>
                              )}
                              <Button size="sm" variant={d.solicitud.estado === 'REVISION' ? 'default' : 'outline'} onClick={() => setSeleccion(d)}>
                                {d.solicitud.estado === 'REVISION' ? 'Revisar' : 'Ver'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Tabla pagos</CardTitle>
              <CardDescription>Simula la información de la pasarela de pagos / banco.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Documento pagador</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">{p.referencia}</TableCell>
                      <TableCell>{formatoPesos(p.valor)}</TableCell>
                      <TableCell>{p.fecha}</TableCell>
                      <TableCell className="font-mono">{p.documentoPagador}</TableCell>
                      <TableCell>{p.banco}</TableCell>
                      <TableCell>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', p.usado ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300')}>
                          {p.usado ? 'Usado' : 'Disponible'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correos">
          <Card>
            <CardHeader>
              <CardTitle>Bandeja de correos simulados</CardTitle>
              <CardDescription>En la versión real se enviarían por SMTP.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {correos.length === 0 && <p className="text-sm text-muted-foreground">Aún no se ha enviado ningún correo.</p>}
              {correos.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Mail className="size-3.5" /> Para: {c.para}</span>
                    <span>{formatoFecha(c.fecha)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium">{c.asunto}</p>
                  <p className="text-sm text-muted-foreground">{c.cuerpo}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modelo">
          <Card>
            <CardHeader>
              <CardTitle>Clasificador recibo / no recibo</CardTitle>
              <CardDescription>
                TF-IDF + Regresión Logística entrenado en el navegador con {modelo.entrenamiento + modelo.prueba} documentos ({modelo.entrenamiento} de
                entrenamiento, {modelo.prueba} de prueba).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Exactitud', modelo.exactitud],
                  ['Precisión', modelo.precision],
                  ['Recall', modelo.recall],
                  ['F1 (meta ≥ 0,85)', modelo.f1],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{k}</p>
                    <p className="text-2xl font-bold tabular-nums">{(v as number).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Matriz de confusión (conjunto de prueba)</p>
                <div className="grid grid-cols-[auto_1fr_1fr] gap-1 text-center text-sm">
                  <div />
                  <div className="text-xs text-muted-foreground">Predice recibo</div>
                  <div className="text-xs text-muted-foreground">Predice no recibo</div>
                  <div className="pr-2 text-right text-xs text-muted-foreground">Es recibo</div>
                  <div className="rounded bg-emerald-100 py-3 font-bold dark:bg-emerald-950">{modelo.matriz.vp}</div>
                  <div className="rounded bg-rose-50 py-3 font-bold dark:bg-rose-950/50">{modelo.matriz.fn}</div>
                  <div className="pr-2 text-right text-xs text-muted-foreground">No es recibo</div>
                  <div className="rounded bg-rose-50 py-3 font-bold dark:bg-rose-950/50">{modelo.matriz.fp}</div>
                  <div className="rounded bg-emerald-100 py-3 font-bold dark:bg-emerald-950">{modelo.matriz.vn}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DialogoRevision detalle={seleccion} onCerrar={() => setSeleccion(null)} />
    </div>
  )
}
