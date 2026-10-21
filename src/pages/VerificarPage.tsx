import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { solicitudService } from '@/container'
import { formatoFecha } from '@/lib/utils'

/** Página pública de verificación (a la que lleva el QR del certificado). */
export function VerificarPage() {
  const { codigo } = useParams()
  const navigate = useNavigate()
  const [texto, setTexto] = useState(codigo ?? '')
  const resultado = codigo ? solicitudService.verificar(codigo) : null

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold">Verificar certificado</h1>
        <p className="text-muted-foreground">Empresas, embajadas o cualquier tercero pueden comprobar si un certificado es auténtico.</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (texto.trim()) navigate(`/verificar/${texto.trim().toUpperCase()}`)
        }}
      >
        <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="CB-XXXXXXXX" className="font-mono uppercase" />
        <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
          <Search /> Verificar
        </Button>
      </form>

      {codigo && resultado?.certificado && (
        <Card className="border-emerald-300 dark:border-emerald-900">
          <CardHeader className="items-center text-center">
            <ShieldCheck className="mx-auto size-12 text-emerald-600" />
            <CardTitle className="text-emerald-700 dark:text-emerald-400">Certificado auténtico</CardTitle>
            <CardDescription>Emitido por CertiBot y registrado en la base de datos.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Código</dt>
              <dd className="font-mono font-semibold">{resultado.certificado.codigoVerificacion}</dd>
              <dt className="text-muted-foreground">Tipo</dt>
              <dd>{resultado.tipo.nombre}</dd>
              <dt className="text-muted-foreground">Titular</dt>
              <dd>
                {resultado.estudiante.nombres} {resultado.estudiante.apellidos} · C.C. ***{resultado.estudiante.documento.slice(-4)}
              </dd>
              <dt className="text-muted-foreground">Programa</dt>
              <dd>{resultado.programa?.nombre}</dd>
              <dt className="text-muted-foreground">Emisión</dt>
              <dd>{formatoFecha(resultado.certificado.fechaEmision)}</dd>
              <dt className="text-muted-foreground">Huella</dt>
              <dd className="font-mono text-xs break-all">{resultado.certificado.hashFirma.slice(0, 32)}…</dd>
            </dl>
          </CardContent>
        </Card>
      )}

      {codigo && !resultado && (
        <Card className="border-rose-300 dark:border-rose-900">
          <CardHeader className="items-center text-center">
            <ShieldAlert className="mx-auto size-12 text-rose-600" />
            <CardTitle className="text-rose-700 dark:text-rose-400">Certificado no encontrado</CardTitle>
            <CardDescription>El código {codigo} no corresponde a ningún certificado emitido. Podría ser falso.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
