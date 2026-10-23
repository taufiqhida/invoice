import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { useStoreProfile } from '../lib/storeProfile.js'

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
  }`

export default function Layout() {
  const { user, logout } = useAuth()
  const store = useStoreProfile()

  if (user === undefined) {
    return <p className="p-8 text-center text-sm text-slate-500">Memuat…</p>
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-indigo-700">{store.name}</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/nota/baru" className={linkCls}>
              Buat Nota
            </NavLink>
            <NavLink to="/riwayat" className={linkCls}>
              Riwayat
            </NavLink>
            <NavLink to="/harga-beli" className={linkCls}>
              Harga Beli
            </NavLink>
            <NavLink to="/rekap" className={linkCls}>
              Rekap
            </NavLink>
            <NavLink to="/toko" className={linkCls}>
              Toko
            </NavLink>
            <button
              type="button"
              onClick={logout}
              className="ml-2 rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
            >
              Keluar
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
