import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { useStoreProfile } from './lib/storeProfile.js'
import BuatNota from './pages/BuatNota.jsx'
import DetailNota from './pages/DetailNota.jsx'
import Login from './pages/Login.jsx'
import PengaturanToko from './pages/PengaturanToko.jsx'
import RiwayatNota from './pages/RiwayatNota.jsx'
import Verifikasi from './pages/Verifikasi.jsx'

export default function App() {
  // Judul tab browser mengikuti nama toko.
  const store = useStoreProfile()
  useEffect(() => {
    document.title = store.name
  }, [store.name])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verifikasi/:token" element={<Verifikasi />} />
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/nota/baru" replace />} />
        <Route path="/nota/baru" element={<BuatNota />} />
        <Route path="/riwayat" element={<RiwayatNota />} />
        <Route path="/nota/:id" element={<DetailNota />} />
        <Route path="/toko" element={<PengaturanToko />} />
      </Route>
    </Routes>
  )
}
