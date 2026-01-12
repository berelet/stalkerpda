import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import PDALayout from './components/layout/PDALayout'
import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import MapPage from './pages/MapPage'
import InventoryPage from './pages/InventoryPage'
import QuestsPage from './pages/QuestsPage'
import ProfilePage from './pages/ProfilePage'
import WikiPage from './pages/WikiPage'
import TradingPage from './pages/TradingPage'
import TraderQuestsPage from './pages/TraderQuestsPage'

function App() {
  const { token, initAuth } = useAuthStore()

  useEffect(() => {
    initAuth()
  }, [initAuth])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <PDALayout />
          </ProtectedRoute>
        }>
          <Route index element={<MapPage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="quests" element={<QuestsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="wiki" element={<WikiPage />} />
          <Route path="trade" element={<TradingPage />} />
          <Route path="trader-quests" element={<TraderQuestsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
