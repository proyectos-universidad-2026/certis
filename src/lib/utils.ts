import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatoPesos = (valor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor)

export const formatoFecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))

export const porcentaje = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)} %`)

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms))
