import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlayersPage from './pages/PlayersPage'
import ArtifactsPage from './pages/ArtifactsPage'
import SpawnArtifactsPage from './pages/SpawnArtifactsPage'
import ItemsPage from './pages/ItemsPage'
import ZonesPage from './pages/ZonesPage'
import ContractsPage from './pages/ContractsPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    // Check if user is authenticated on mount
    checkAuth()
  }, [checkAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/artifacts" element={<ArtifactsPage />} />
                <Route path="/spawn-artifacts" element={<SpawnArtifactsPage />} />
                <Route path="/items" element={<ItemsPage />} />
                <Route path="/zones" element={<ZonesPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
