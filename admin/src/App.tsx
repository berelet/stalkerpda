import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import PlayersPage from './pages/PlayersPage'
import ArtifactsPage from './pages/ArtifactsPage'
import ZonesPage from './pages/ZonesPage'
import ContractsPage from './pages/ContractsPage'
import { useAuthStore } from './stores/authStore'

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/players"
          element={isAuthenticated ? <PlayersPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/artifacts"
          element={isAuthenticated ? <ArtifactsPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/zones"
          element={isAuthenticated ? <ZonesPage /> : <Navigate to="/login" />}
        />
        <Route
          path="/contracts"
          element={isAuthenticated ? <ContractsPage /> : <Navigate to="/login" />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
