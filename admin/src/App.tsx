import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlayersPage from './pages/PlayersPage'
import ArtifactsPage from './pages/ArtifactsPage'
import SpawnArtifactsPage from './pages/SpawnArtifactsPage'
import ZonesPage from './pages/ZonesPage'
import ContractsPage from './pages/ContractsPage'
import Layout from './components/Layout'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/artifacts" element={<ArtifactsPage />} />
          <Route path="/spawn-artifacts" element={<SpawnArtifactsPage />} />
          <Route path="/zones" element={<ZonesPage />} />
          <Route path="/contracts" element={<ContractsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
