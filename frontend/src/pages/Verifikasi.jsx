import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { formatRupiah } from '../lib/format.js'
import { STATUS_LABEL } from '../lib/invoiceStore.js'

const formatDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Halaman publik (tanpa login) yang dibuka dari QR di nota cetak.
export default function Verifikasi() {
  const { token } = useParams()
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let alive = true
    api(`/verify/${encodeURIComponent(token)}`)
      .then((data) => alive && setState({ status: 'ok', data }))
      .catch((err) => alive && setState({ status: err.status === 404 ? 'invalid' : 'error', message: err.message }))
    return () => {
      alive = false
    }
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {state.status === 'loading' && <p className="text-center text-sm text-slate-500">Memeriksa nota…</p>}

        {state.status === 'invalid' && (
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
              ✕
            </div>
            <h1 className="text-lg font-semibold">Nota tidak ditemukan</h1>
            <p className="mt-1 text-sm text-slate-600">
              Kode QR ini tidak cocok dengan nota mana pun. Nota mungkin palsu, sudah dihapus, atau QR-nya rusak.
            </p>
          </div>
        )}

        {state.status === 'error' && (
          <p role="alert" className="text-center text-sm text-red-700">
            Verifikasi belum bisa dilakukan: {state.message}
          </p>
        )}

        {state.status === 'ok' && (
          <div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                ✓
              </div>
              <h1 className="text-lg font-semibold">Nota terdaftar</h1>
              <p className="text-sm text-slate-500">{state.data.store}</p>
            </div>
            <dl className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <Row label="Nomor nota" value={state.data.invoiceNumber} strong />
              <Row label="Tanggal" value={formatDate(state.data.date)} />
              <Row label="Pelanggan" value={state.data.customerName} />
              <Row label="Jumlah barang" value={`${state.data.itemCount} jenis`} />
              <Row label="Status" value={STATUS_LABEL[state.data.status] ?? state.data.status} />
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="text-indigo-700">{formatRupiah(state.data.total)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              Cocokkan <strong>nomor</strong> dan <strong>total</strong> di atas dengan nota di tangan Anda. Bila berbeda, nota
              kemungkinan diubah setelah dicetak. Terakhir diperbarui: {formatDateTime(state.data.updatedAt)}.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, strong }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`text-right ${strong ? 'font-semibold text-indigo-700' : 'font-medium'}`}>{value}</dd>
    </div>
  )
}
