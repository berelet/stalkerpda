import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import PDALayout from './components/layout/PDALayout'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import InventoryPage from './pages/InventoryPage'
import ContractsPage from './pages/ContractsPage'
import ProfilePage from './pages/ProfilePage'
import WikiPage from './pages/WikiPage'

function App() {
  const { token, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/" element={token ? <PDALayout /> : <Navigate to="/login" />}>
          <Route index element={<MapPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wiki" element={<WikiPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
