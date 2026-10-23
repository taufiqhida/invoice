import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { formatDayDate, formatRupiah, todayISO } from '../lib/format.js'

const inputCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

const monthStart = () => `${todayISO().slice(0, 7)}-01`

const periodLabel = (period, group) =>
  group === 'month'
    ? new Date(`${period}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    : formatDayDate(period)

const profitCls = (n) => (n < 0 ? 'text-red-600' : 'text-emerald-700')

// Rekap penjualan, modal, dan untung per hari atau per bulan. Hanya terlihat setelah login.
export default function Rekap() {
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(todayISO())
  const [group, setGroup] = useState('day')
  const [paidOnly, setPaidOnly] = useState(false)
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!from || !to) return undefined
    if (from > to) {
      setError('Tanggal awal tidak boleh setelah tanggal akhir.')
      return undefined
    }
    let stale = false
    setLoading(true)
    setError('')
    api(`/reports/profit?from=${from}&to=${to}&group=${group}&paid_only=${paidOnly ? 1 : 0}`)
      .then((data) => !stale && setReport(data))
      .catch((e) => !stale && (setReport(null), setError(e.message)))
      .finally(() => !stale && setLoading(false))
    return () => {
      stale = true
    }
  }, [from, to, group, paidOnly])

  const rows = report?.rows ?? []
  const totals = report?.totals

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Rekap Untung</h1>
        <p className="mt-1 text-sm text-slate-500">
          Untung = penjualan − harga beli (modal) − diskon. Hanya barang yang harga belinya sudah diisi yang ikut
          dihitung untungnya.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Dari</span>
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Sampai</span>
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Rekap per</span>
            <select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="day">Hari</option>
              <option value="month">Bulan</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" checked={paidOnly} onChange={(e) => setPaidOnly(e.target.checked)} />
            Hanya nota lunas
          </label>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {totals && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ['Penjualan', formatRupiah(totals.sales), ''],
            ['Modal', formatRupiah(totals.cost), ''],
            ['Diskon', formatRupiah(totals.discount), ''],
            ['Untung', formatRupiah(totals.profit), profitCls(totals.profit)],
          ].map(([label, value, cls]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500">{label}</p>
              <p className={`mt-1 text-lg font-semibold ${cls}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {totals?.uncostedItems > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {totals.uncostedItems} barang belum diisi harga belinya, jadi belum ikut dihitung untungnya. Isi lewat menu
          Riwayat → buka nota → Ubah nota.
        </p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && <p className="p-5 text-sm text-slate-500">Memuat rekap…</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="p-5 text-sm text-slate-500">Belum ada penjualan pada rentang tanggal ini.</p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-2 font-medium">{group === 'month' ? 'Bulan' : 'Tanggal'}</th>
                  <th className="px-5 py-2 text-right font-medium">Penjualan</th>
                  <th className="px-5 py-2 text-right font-medium">Modal</th>
                  <th className="px-5 py-2 text-right font-medium">Diskon</th>
                  <th className="px-5 py-2 text-right font-medium">Untung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.period}>
                    <td className="px-5 py-3">
                      {periodLabel(r.period, group)}
                      {r.uncostedItems > 0 && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                          {r.uncostedItems} tanpa modal
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(r.sales)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(r.cost)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(r.discount)}</td>
                    <td className={`whitespace-nowrap px-5 py-3 text-right font-semibold ${profitCls(r.profit)}`}>
                      {formatRupiah(r.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                <tr>
                  <td className="px-5 py-3">Total</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(totals.sales)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(totals.cost)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">{formatRupiah(totals.discount)}</td>
                  <td className={`whitespace-nowrap px-5 py-3 text-right ${profitCls(totals.profit)}`}>
                    {formatRupiah(totals.profit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
