import { BadgeCheck, FileStack, LayoutDashboard, Send, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const enlaces = [
  { to: '/', texto: 'Solicitar', Icono: Send },
  { to: '/recibos-demo', texto: 'Recibos demo', Icono: FileStack },
  { to: '/verificar', texto: 'Verificar', Icono: ShieldCheck },
  { to: '/admin', texto: 'Panel admin', Icono: LayoutDashboard },
]

export function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-indigo-50/60 to-background dark:from-indigo-950/20">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-white">
              <BadgeCheck className="size-5" />
            </span>
            <span>
              CertiBot <span className="hidden text-xs font-normal text-muted-foreground sm:inline">· certificados en minutos</span>
            </span>
          </NavLink>
          <nav className="flex flex-wrap gap-1 sm:ml-auto">
            {enlaces.map(({ to, texto, Icono }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white',
                  )
                }
              >
                <Icono className="size-4" />
                {texto}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        CertiBot · Prototipo académico (simulación en el navegador) · Sharick De Las Aguas, Valerin Cárdenas, Martín Simarra, José Colón
      </footer>
    </div>
  )
}
