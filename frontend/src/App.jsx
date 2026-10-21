import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import BuatNota from './pages/BuatNota.jsx'
import DetailNota from './pages/DetailNota.jsx'
import Login from './pages/Login.jsx'
import RiwayatNota from './pages/RiwayatNota.jsx'
import Verifikasi from './pages/Verifikasi.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verifikasi/:token" element={<Verifikasi />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/nota/baru" replace />} />
        <Route path="/nota/baru" element={<BuatNota />} />
        <Route path="/riwayat" element={<RiwayatNota />} />
        <Route path="/nota/:id" element={<DetailNota />} />
      </Route>
    </Routes>
  )
}
