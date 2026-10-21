import { useState } from 'react'
import { updateStoreProfile, useStoreProfile } from '../lib/storeProfile.js'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

export default function PengaturanToko() {
  const profile = useStoreProfile()
  if (!profile.loaded) return <p className="p-8 text-center text-sm text-slate-500">Memuat…</p>
  // Form dibuat setelah profil diterima supaya isian awalnya langsung benar.
  return <StoreForm initial={profile} />
}

function StoreForm({ initial }) {
  const [name, setName] = useState(initial.name)
  const [address, setAddress] = useState(initial.address)
  const [phone, setPhone] = useState(initial.phone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setSaved(false)
    if (!name.trim()) return setError('Nama toko wajib diisi.')
    if (phone.trim() && !/^[0-9+\-\s()]{6,30}$/.test(phone.trim())) return setError('Nomor telepon tidak valid.')
    setBusy(true)
    setError('')
    try {
      await updateStoreProfile({ name: name.trim(), address: address.trim(), phone: phone.trim() })
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Profil Toko</h1>
        <p className="text-sm text-slate-500">
          Tampil di judul aplikasi, bagian atas nota cetak, dan halaman verifikasi QR.
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nama toko</span>
        <input className={inputCls} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Alamat (opsional)</span>
        <input className={inputCls} value={address} maxLength={255} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Telepon / WhatsApp (opsional)</span>
        <input className={inputCls} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Profil toko sudah disimpan. Nota yang sudah tersimpan ikut memakai nama baru saat dibuka atau dicetak.
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy ? 'Menyimpan…' : 'Simpan'}
      </button>
    </form>
  )
}
