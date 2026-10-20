import { NavLink, Outlet } from 'react-router-dom'

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
  }`

export default function Layout() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-indigo-700">Nota Toko Saya</span>
          <nav className="flex gap-1">
            <NavLink to="/nota/baru" className={linkCls}>
              Buat Nota
            </NavLink>
            <NavLink to="/riwayat" className={linkCls}>
              Riwayat
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">
        <Outlet />
      </main>
    </div>
  )
}
