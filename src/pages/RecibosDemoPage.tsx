import { useNavigate } from 'react-router-dom'
import { ArrowRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { EstadoBadge } from '@/components/EstadoBadge'
import { reciboComoArchivo, svgDataUrl, svgRecibo } from '@/components/recibos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { recibosDemo, type ReciboDemo } from '@/ia/escenarios'
import { cn } from '@/lib/utils'
import { useSolicitudStore } from '@/stores/useSolicitudStore'

export function RecibosDemoPage() {
  const navigate = useNavigate()
  const { setArchivo, setEscenario, usarEstudianteDemo, setCampo } = useSolicitudStore()

  const usar = async (demo: ReciboDemo) => {
    setArchivo(await reciboComoArchivo(demo))
    setEscenario('auto')
    usarEstudianteDemo()
    setCampo('tipoId', 1)
    toast.success(`Recibo "${demo.titulo}" cargado en el formulario`)
    navigate('/')
  }

  const descargar = async (demo: ReciboDemo) => {
    const archivo = await reciboComoArchivo(demo)
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Recibos de demostración</h1>
        <p className="text-muted-foreground">
          Los casos de prueba del plan. Todos pertenecen a la estudiante de prueba <b>Laura Camila Pérez</b> (código 2021001, cédula
          1001234567) y se prueban con el <b>certificado de notas</b> ($25.000).
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {recibosDemo.map((demo) => (
          <Card key={demo.id} className="flex flex-col">
            <div className="overflow-hidden rounded-t-xl border-b bg-muted/40 p-4">
              <img
                src={svgDataUrl(svgRecibo(demo))}
                alt={demo.titulo}
                className={cn('mx-auto h-56 rounded shadow-md', demo.borroso && 'blur-[2px]')}
              />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{demo.titulo}</CardTitle>
                <EstadoBadge estado={demo.resultadoEsperado} />
              </div>
              <CardDescription>{demo.descripcion}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1" />
            <CardFooter className="gap-2">
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => usar(demo)}>
                Usar en el formulario <ArrowRight />
              </Button>
              <Button variant="outline" size="icon" onClick={() => descargar(demo)} aria-label="Descargar PNG">
                <Download />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
