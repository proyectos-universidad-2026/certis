/** Estado de la pantalla "Solicitar certificado" (formulario + progreso del análisis). */
import { create } from 'zustand'
import { solicitudService } from '@/container'
import type { EscenarioId } from '@/ia/escenarios'

interface Formulario {
  codigo: string
  documento: string
  correo: string
  tipoId: number | null
}

interface SolicitudState {
  formulario: Formulario
  archivo: File | null
  escenario: EscenarioId
  procesando: boolean
  pasoActual: number
  error: string | null
  setCampo: <K extends keyof Formulario>(campo: K, valor: Formulario[K]) => void
  setArchivo: (archivo: File | null) => void
  setEscenario: (e: EscenarioId) => void
  /** Rellena el formulario con el estudiante de prueba. */
  usarEstudianteDemo: () => void
  enviar: () => Promise<number | null>
}

const vacio: Formulario = { codigo: '', documento: '', correo: '', tipoId: 1 }

export const useSolicitudStore = create<SolicitudState>((set, get) => ({
  formulario: vacio,
  archivo: null,
  escenario: 'auto',
  procesando: false,
  pasoActual: -1,
  error: null,

  setCampo: (campo, valor) => set((s) => ({ formulario: { ...s.formulario, [campo]: valor }, error: null })),
  setArchivo: (archivo) => set({ archivo, error: null }),
  setEscenario: (escenario) => set({ escenario }),
  usarEstudianteDemo: () =>
    set((s) => ({
      formulario: { ...s.formulario, codigo: '2021001', documento: '1001234567', correo: 'laura.perez@correo.edu.co' },
      error: null,
    })),

  enviar: async () => {
    const { formulario, archivo, escenario } = get()
    set({ procesando: true, pasoActual: 0, error: null })
    try {
      const id = await solicitudService.crear(
        { ...formulario, tipoId: formulario.tipoId ?? 0, archivo, escenario },
        (paso) => set({ pasoActual: paso }),
      )
      set({ procesando: false, pasoActual: -1, archivo: null, escenario: 'auto' })
      return id
    } catch (e) {
      set({ procesando: false, pasoActual: -1, error: e instanceof Error ? e.message : String(e) })
      return null
    }
  },
}))
