/** Estado del panel administrativo: solicitudes, métricas, pagos y bandeja de correos. */
import { create } from 'zustand'
import { db, repositorios, solicitudService } from '@/container'
import type { CorreoSimulado, EstadoSolicitud, Pago } from '@/domain/entities'
import type { DetalleSolicitud, Metricas } from '@/services/solicitudService'

interface AdminState {
  solicitudes: DetalleSolicitud[]
  metricas: Metricas | null
  pagos: Pago[]
  correos: CorreoSimulado[]
  filtro: EstadoSolicitud | 'TODAS'
  refrescar: () => void
  setFiltro: (f: EstadoSolicitud | 'TODAS') => void
  revisar: (id: number, aprobar: boolean, comentario: string) => Promise<void>
  reiniciarDemo: () => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  solicitudes: [],
  metricas: null,
  pagos: [],
  correos: [],
  filtro: 'TODAS',

  refrescar: () => {
    const { filtro } = get()
    set({
      solicitudes: solicitudService.listar(filtro === 'TODAS' ? undefined : filtro),
      metricas: solicitudService.metricas(),
      pagos: [...repositorios.pagos.listar()],
      correos: repositorios.correos.listar(),
    })
  },
  setFiltro: (filtro) => {
    set({ filtro })
    get().refrescar()
  },
  revisar: async (id, aprobar, comentario) => {
    await solicitudService.revisar(id, aprobar, comentario)
    get().refrescar()
  },
  reiniciarDemo: () => {
    db.reiniciar()
    get().refrescar()
  },
}))
