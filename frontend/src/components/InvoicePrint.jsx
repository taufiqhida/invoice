import { Fragment } from 'react'
import { formatDayDate, formatRupiah } from '../lib/format.js'
import { mockStore } from '../mocks/data.js'

const formatDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// Kelompokkan barang per tanggal (urut naik); nomor urut berlanjut lintas hari.
function groupByDate(invoice) {
  const byDate = new Map()
  invoice.items.forEach((item) => {
    const date = item.date || invoice.date
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(item)
  })
  let no = 0
  return [...byDate.keys()].sort().map((date) => {
    const rows = byDate.get(date).map((item) => ({ item, no: ++no }))
    return { date, rows, total: rows.reduce((s, r) => s + r.item.qty * r.item.price, 0) }
  })
}

// Lembar nota: dipakai untuk pratinjau layar dan cetak (A4 / struk lebar). Header toko selalu di atas.
export default function InvoicePrint({ invoice, store = mockStore }) {
  const groups = groupByDate(invoice)
  return (
    <article className="invoice-sheet mx-auto w-full max-w-[210mm] bg-white p-8 text-sm text-slate-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
      <header className="flex items-start gap-4 border-b-2 border-slate-800 pb-4">
        {store.logoPath ? (
          <img src={store.logoPath} alt={`Logo ${store.name}`} className="h-16 w-16 object-contain" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-indigo-600 text-2xl font-bold text-white print:border print:border-slate-800 print:bg-white print:text-slate-800">
            {store.name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-xl font-bold uppercase tracking-wide">{store.name}</h1>
          <p className="text-slate-600">{store.address}</p>
          <p className="text-slate-600">Telp/WA: {store.phone}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">NOTA</p>
          <p className="font-medium">{invoice.invoiceNumber}</p>
          <p className="text-slate-600">{formatDate(invoice.date)}</p>
        </div>
      </header>

      <section className="mt-4">
        <p className="text-xs uppercase text-slate-500">Kepada</p>
        <p className="font-semibold">{invoice.customerName}</p>
        {invoice.customerPhone && <p className="text-slate-600">{invoice.customerPhone}</p>}
      </section>

      <table className="mt-4 w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-slate-800 text-xs uppercase">
            <th className="w-10 py-2">No</th>
            <th className="py-2">Nama barang</th>
            <th className="w-20 py-2 text-right">Jumlah</th>
            <th className="w-32 py-2 text-right">Harga</th>
            <th className="w-32 py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.date}>
              <tr className="bg-slate-100 print:bg-slate-100">
                <td colSpan={5} className="px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  {formatDayDate(g.date)}
                </td>
              </tr>
              {g.rows.map(({ item: it, no }) => (
                <tr key={no} className="border-b border-slate-200 align-top">
                  <td className="py-2">{no}</td>
                  <td className="py-2">{it.name}</td>
                  <td className="py-2 text-right">{it.qty}</td>
                  <td className="py-2 text-right">{formatRupiah(it.price)}</td>
                  <td className="py-2 text-right">{formatRupiah(it.qty * it.price)}</td>
                </tr>
              ))}
              {groups.length > 1 && (
                <tr className="border-b border-slate-300 text-xs text-slate-600">
                  <td colSpan={4} className="py-1.5 text-right">
                    Total hari ini
                  </td>
                  <td className="py-1.5 text-right font-medium">{formatRupiah(g.total)}</td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between gap-8">
        <div className="flex-1 text-slate-600">
          {invoice.note && (
            <>
              <p className="text-xs uppercase text-slate-500">Catatan</p>
              <p>{invoice.note}</p>
            </>
          )}
        </div>
        <dl className="w-64 space-y-1">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatRupiah(invoice.subtotal)}</dd>
          </div>
          {invoice.discount > 0 && (
            <div className="flex justify-between">
              <dt>Diskon</dt>
              <dd>- {formatRupiah(invoice.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-slate-800 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd>{formatRupiah(invoice.total)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-10 text-center text-xs text-slate-500">Terima kasih atas kunjungan Anda.</footer>
    </article>
  )
}
