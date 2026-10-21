/** Notificaciones por correo SIMULADAS: se guardan en la bandeja del panel administrativo. */
import type { ICorreoRepository } from '@/domain/repositories'

export const CORREO_FUNCIONARIO = 'registro@certibot-demo.edu.co'
export const CORREO_SOPORTE = 'soporte.ti@certibot-demo.edu.co'

export class Notificador {
  constructor(private correos: ICorreoRepository) {}

  enviar(para: string, asunto: string, cuerpo: string) {
    this.correos.guardar({ para, asunto, cuerpo })
  }
}
