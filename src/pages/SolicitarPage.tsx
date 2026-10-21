import { useRef, useState, type DragEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, FileUp, Loader2, Sparkles, Upload, UserRound, X, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { repositorios } from '@/container'
import { escenariosSeleccionables, type EscenarioId } from '@/ia/escenarios'
import { PASOS_IA } from '@/ia/servicioIA'
import { cn, formatoPesos } from '@/lib/utils'
import { validarArchivo } from '@/services/solicitudService'
import { useSolicitudStore } from '@/stores/useSolicitudStore'

const tipos = repositorios.tipos.listar()

function ZonaArchivo() {
  const { archivo, setArchivo } = useSolicitudStore()
  const input = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const elegir = (f: File | undefined) => {
    if (!f) return
    const e = validarArchivo(f) // validación en el navegador (tipo y tamaño)
    setError(e)
    setArchivo(e ? null : f)
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    elegir(e.dataTransfer.files[0])
  }

  if (archivo)
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/40">
        <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{archivo.name}</p>
          <p className="text-xs text-muted-foreground">{(archivo.size / 1024).toFixed(0)} KB · {archivo.type}</p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setArchivo(null)} aria-label="Quitar archivo">
          <X />
        </Button>
      </div>
    )

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setArrastrando(true)
        }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={soltar}
        className={cn(
          'flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30',
          arrastrando && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
        )}
      >
        <Upload className="size-6 text-indigo-500" />
        <span className="text-sm font-medium">Arrastra tu recibo o haz clic para elegirlo</span>
        <span className="text-xs text-muted-foreground">PDF, JPG o PNG · máximo 5 MB</span>
      </button>
      <input ref={input} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={(e) => elegir(e.target.files?.[0])} />
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        ¿No tienes un recibo? Usa uno de los{' '}
        <Link to="/recibos-demo" className="font-medium text-indigo-600 underline-offset-2 hover:underline">
          recibos de demostración
        </Link>
        .
      </p>
    </div>
  )
}

function Progreso({ paso }: { paso: number }) {
  return (
    <ol className="space-y-3">
      {PASOS_IA.map((texto, i) => {
        const hecho = i < paso
        const actual = i === paso
        return (
          <li key={texto} className={cn('flex items-center gap-3 text-sm transition-opacity', !hecho && !actual && 'opacity-40')}>
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full border', hecho && 'border-emerald-500 bg-emerald-500 text-white', actual && 'border-indigo-500 text-indigo-600')}>
              {hecho ? <CheckCircle2 className="size-4" /> : actual ? <Loader2 className="size-4 animate-spin" /> : i + 1}
            </span>
            {texto}
          </li>
        )
      })}
    </ol>
  )
}

export function SolicitarPage() {
  const navigate = useNavigate()
  const { formulario, escenario, procesando, pasoActual, error, setCampo, setEscenario, usarEstudianteDemo, enviar } = useSolicitudStore()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = await enviar()
    if (id) {
      toast.success(`Solicitud #${id} procesada`)
      navigate(`/resultado/${id}`)
    }
  }

  const tipoSel = tipos.find((t) => t.id === formulario.tipoId)

  return (
    <div className="space-y-8">
      <section className="space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          <Sparkles className="size-3.5" /> IA + automatización
        </span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu certificado académico en minutos, no en 15 días</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          Sube el recibo de pago. La IA lo lee y lo valida contra los pagos registrados y, si todo coincide, el certificado en PDF con
          código QR se emite al instante. Si el sistema tiene dudas, un funcionario lo revisa.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Solicitar certificado</CardTitle>
            <CardDescription>Todos los campos son obligatorios.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código estudiantil</Label>
                  <Input id="codigo" value={formulario.codigo} onChange={(e) => setCampo('codigo', e.target.value)} placeholder="2021001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="documento">Cédula</Label>
                  <Input id="documento" value={formulario.documento} onChange={(e) => setCampo('documento', e.target.value)} placeholder="1001234567" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="correo">Correo electrónico</Label>
                  <Input id="correo" type="email" value={formulario.correo} onChange={(e) => setCampo('correo', e.target.value)} placeholder="nombre@correo.edu.co" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Tipo de certificado</Label>
                  <Select
                    value={formulario.tipoId ? String(formulario.tipoId) : null}
                    onValueChange={(v) => setCampo('tipoId', v ? Number(v) : null)}
                    items={tipos.map((t) => ({ value: String(t.id), label: `${t.nombre} · ${formatoPesos(t.tarifa)}` }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecciona…" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipos.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre} · {formatoPesos(t.tarifa)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Recibo de pago</Label>
                <ZonaArchivo />
              </div>

              <div className="space-y-1.5 rounded-lg border border-dashed bg-muted/30 p-3">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="size-3.5" /> Escenario de simulación (solo para la demo)
                </Label>
                <Select
                  value={escenario}
                  onValueChange={(v) => setEscenario((v ?? 'auto') as EscenarioId)}
                  items={escenariosSeleccionables.map((e) => ({ value: e.id, label: e.nombre }))}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {escenariosSeleccionables.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  No hay OCR real: el texto del recibo se simula. La extracción, el clasificador ML y las reglas sí se ejecutan.
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle />
                  <AlertTitle>No se pudo enviar</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="lg" disabled={procesando} className="bg-indigo-600 hover:bg-indigo-700">
                  {procesando ? <Loader2 className="animate-spin" /> : <FileUp />}
                  {procesando ? 'Analizando recibo…' : 'Enviar solicitud'}
                </Button>
                <Button type="button" variant="outline" size="lg" onClick={usarEstudianteDemo} disabled={procesando}>
                  <UserRound /> Usar estudiante de prueba
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className={cn(procesando && 'ring-2 ring-indigo-400')}>
          <CardHeader>
            <CardTitle>{procesando ? 'Procesando tu solicitud…' : '¿Qué pasa al enviar?'}</CardTitle>
            <CardDescription>
              {tipoSel ? `Tarifa del ${tipoSel.nombre.toLowerCase()}: ${formatoPesos(tipoSel.tarifa)}` : 'Selecciona un tipo de certificado'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Progreso paso={procesando ? pasoActual : -1} />
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Después, el motor de reglas decide:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>Pago existe, cubre la tarifa, no fue usado y confianza ≥ 80 % → <b className="text-emerald-600">Aprobada</b></li>
                <li>Imagen poco legible o referencia no registrada → <b className="text-amber-600">Revisión manual</b></li>
                <li>No es recibo, valor insuficiente o pago ya usado → <b className="text-rose-600">Rechazada</b></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
