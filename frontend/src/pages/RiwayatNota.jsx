import { Link } from 'react-router-dom'
import { formatRupiah } from '../lib/format.js'
import { STATUS_LABEL, useInvoices } from '../lib/invoiceStore.js'

const statusStyle = {
  draft: 'bg-amber-100 text-amber-800',
  terkirim: 'bg-sky-100 text-sky-700',
  lunas: 'bg-emerald-100 text-emerald-700',
}

const formatDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

export default function RiwayatNota() {
  const { invoices, loading, error, reload } = useInvoices()
  const sorted = [...invoices].sort((a, b) => b.id - a.id)

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between p-5">
        <h1 className="text-xl font-semibold">Riwayat Nota</h1>
        <Link
          to="/nota/baru"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          + Buat Nota
        </Link>
      </div>
      {loading ? (
        <p className="px-5 pb-8 text-sm text-slate-500">Memuat nota…</p>
      ) : error ? (
        <p role="alert" className="mx-5 mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Nota belum bisa dimuat: {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      ) : sorted.length === 0 ? (
        <p className="px-5 pb-8 text-sm text-slate-500">Belum ada nota tersimpan.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-2 font-medium">No. Nota</th>
                <th className="px-5 py-2 font-medium">Tanggal</th>
                <th className="px-5 py-2 font-medium">Pelanggan</th>
                <th className="px-5 py-2 text-right font-medium">Total</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((inv) => (
                <tr key={inv.id}>
                  <td className="whitespace-nowrap px-5 py-3 font-medium">
                    <Link to={`/nota/${inv.id}`} className="text-indigo-700 hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3">{inv.customerName}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(inv.total)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle[inv.status]}`}>
                      {STATUS_LABEL[inv.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
