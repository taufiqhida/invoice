import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { formatRupiah } from '../lib/format.js'

// Modal konfirmasi setelah nota tersimpan. Cetak/PDF menyusul di fase berikutnya (Cetak & Kirim Nota).
export default function SavedInvoiceModal({ invoice, onNew, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="saved-title" className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
          ✓
        </div>
        <h2 id="saved-title" className="text-center text-lg font-semibold">
          Nota berhasil disimpan
        </h2>
        <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Nomor nota</dt>
            <dd className="font-semibold text-indigo-700">{invoice.invoiceNumber}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Pelanggan</dt>
            <dd className="font-medium">{invoice.customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Total</dt>
            <dd className="font-semibold">{formatRupiah(invoice.total)}</dd>
          </div>
        </dl>
        <div className="mt-5 grid gap-2">
          <Link
            to={`/nota/${invoice.id}`}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Lihat & cetak nota
          </Link>
          <button
            type="button"
            onClick={onNew}
            autoFocus
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Buat nota baru
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
