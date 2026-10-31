import { useEffect, useState } from 'react'
import { formatRupiah } from '../lib/format.js'
import { STATUS_LABEL } from '../lib/invoiceStore.js'

const ORDER = Object.keys(STATUS_LABEL) // draft < terkirim < lunas

const formatDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

// Jendela untuk menggabungkan nota lain milik pelanggan yang sama ke nota yang sedang dibuka.
// Pratinjau hasil dihitung di sini dengan aturan yang sama seperti server (yang menentukan hasil akhir).
export default function MergeNota({ invoice, others, onMerge, onClose }) {
  const [picked, setPicked] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  const chosen = others.filter((o) => picked.includes(o.id))
  const all = [invoice, ...chosen]
  const subtotal = all.reduce((s, i) => s + i.subtotal, 0)
  const discount = Math.min(
    all.reduce((s, i) => s + i.discount, 0),
    subtotal,
  )
  const status = all.reduce((low, i) => (ORDER.indexOf(i.status) < ORDER.indexOf(low) ? i.status : low), invoice.status)
  const itemCount = all.reduce((s, i) => s + i.items.length, 0)

  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const submit = async () => {
    if (chosen.length === 0 || busy) return
    setBusy(true)
    setError('')
    try {
      await onMerge(chosen.map((o) => o.id))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="merge-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 id="merge-title" className="text-lg font-semibold">
          Gabungkan nota ke {invoice.invoiceNumber}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pilih nota {invoice.customerName} yang mau digabung. Semua barangnya dipindah ke nota ini, lalu nota yang
          dipilih dihapus.
        </p>

        <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {others.map((o) => (
            <li key={o.id}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                <input type="checkbox" checked={picked.includes(o.id)} onChange={() => toggle(o.id)} disabled={busy} />
                <span className="flex-1">
                  <span className="font-medium">{o.invoiceNumber}</span>
                  <span className="block text-xs text-slate-500">
                    {formatDate(o.date)} · {o.items.length} barang · {STATUS_LABEL[o.status]}
                  </span>
                </span>
                <span className="font-medium">{formatRupiah(o.total)}</span>
              </label>
            </li>
          ))}
        </ul>

        {chosen.length > 0 && (
          <dl className="mt-4 space-y-1 rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
            <p className="font-semibold">Hasil gabungan</p>
            <div className="flex justify-between">
              <dt>Jumlah barang</dt>
              <dd>{itemCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatRupiah(subtotal)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <dt>Diskon (dijumlahkan)</dt>
                <dd>- {formatRupiah(discount)}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{formatRupiah(subtotal - discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Status</dt>
              <dd>{STATUS_LABEL[status]}</dd>
            </div>
          </dl>
        )}

        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Perhatian: nota yang digabung <strong>dihapus</strong> dan tidak bisa dikembalikan. Kode QR di nota yang sudah
          pernah dicetak dari nota itu tidak akan bisa diverifikasi lagi. Status hasil memakai yang paling belum selesai
          (lunas hanya bila semuanya lunas).
        </p>

        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || chosen.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {busy ? 'Menggabungkan…' : chosen.length ? `Gabungkan ${chosen.length} nota` : 'Gabungkan'}
          </button>
        </div>
      </div>
    </div>
  )
}
