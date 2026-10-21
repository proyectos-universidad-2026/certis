import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AdminPage } from '@/pages/AdminPage'
import { RecibosDemoPage } from '@/pages/RecibosDemoPage'
import { ResultadoPage } from '@/pages/ResultadoPage'
import { SolicitarPage } from '@/pages/SolicitarPage'
import { VerificarPage } from '@/pages/VerificarPage'

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<SolicitarPage />} />
            <Route path="resultado/:id" element={<ResultadoPage />} />
            <Route path="recibos-demo" element={<RecibosDemoPage />} />
            <Route path="verificar/:codigo?" element={<VerificarPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </TooltipProvider>
  )
}
