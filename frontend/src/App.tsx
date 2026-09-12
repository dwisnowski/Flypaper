import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { AppShell } from './components/AppShell'
import HomePage from './pages/HomePage'

const GlobePage = lazy(() => import('./pages/GlobePage'))

function GlobeFallback() {
  return (
    <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
      <CircularProgress />
    </Box>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route
            path="globe"
            element={
              <Suspense fallback={<GlobeFallback />}>
                <GlobePage />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
