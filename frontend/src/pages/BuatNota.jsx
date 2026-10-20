import { useState } from 'react'
import CustomerPicker from '../components/CustomerPicker.jsx'
import SavedInvoiceModal from '../components/SavedInvoiceModal.jsx'
import { formatRupiah, toNumber, todayISO } from '../lib/format.js'
import { mockCustomers, formatInvoiceNumber } from '../mocks/data.js'
import { addInvoice, useInvoices } from '../mocks/invoiceStore.js'

const newItem = (date = todayISO()) => ({ id: crypto.randomUUID(), name: '', qty: '1', price: '', date })

const ITEM_GRID = 'sm:grid-cols-[140px_1fr_64px_110px_100px_28px]'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

export default function BuatNota() {
  const [customers, setCustomers] = useState(mockCustomers)
  const [customerId, setCustomerId] = useState('')
  const [date, setDate] = useState(todayISO())
  const [items, setItems] = useState([newItem()])
  const [discount, setDiscount] = useState('')
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(null)

  // Tiruan: pelanggan baru hanya hidup di state; fase backend akan POST /api/customers.
  const addCustomer = ({ name, phone }) => {
    const created = { id: Date.now(), name, phone }
    setCustomers((prev) => [...prev, created])
    return created
  }

  const invoices = useInvoices()
  const invoiceNumber = formatInvoiceNumber(invoices.length + (saved ? 0 : 1))

  // Baris kosong dibiarkan netral; baris terisi sebagian ditandai & tidak dihitung.
  const rowStatus = (it) => {
    const touched = it.name.trim() || it.price !== ''
    if (!touched) return { state: 'empty' }
    const problems = []
    if (!it.date) problems.push('tanggal kosong')
    if (!it.name.trim()) problems.push('nama barang kosong')
    if (toNumber(it.qty) <= 0) problems.push('jumlah harus lebih dari 0')
    if (toNumber(it.price) <= 0) problems.push('harga harus lebih dari 0')
    return problems.length ? { state: 'invalid', problems } : { state: 'valid' }
  }
  const statuses = items.map(rowStatus)
  const validItems = items.filter((_, i) => statuses[i].state === 'valid')
  const invalidCount = statuses.filter((s) => s.state === 'invalid').length

  const subtotal = validItems.reduce((sum, it) => sum + toNumber(it.qty) * toNumber(it.price), 0)
  const discountValue = Math.min(toNumber(discount), subtotal)
  const total = subtotal - discountValue

  const updateItem = (id, field, value) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)))
  const removeItem = (id) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev))

  const errors = []
  if (!customerId) errors.push('Pelanggan belum dipilih.')
  if (!date) errors.push('Tanggal nota belum diisi.')
  if (validItems.length === 0) errors.push('Tambahkan minimal satu barang dengan nama, jumlah, dan harga yang valid.')
  if (invalidCount > 0) errors.push(`${invalidCount} baris barang belum lengkap. Lengkapi atau hapus baris tersebut.`)
  if (toNumber(discount) < 0) errors.push('Diskon tidak boleh bernilai negatif.')

  // Pesan baru muncul setelah pengguna mencoba menyimpan, lalu ikut diperbarui saat data diubah.
  const [submitted, setSubmitted] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (errors.length > 0 || saved) return
    const customer = customers.find((c) => String(c.id) === String(customerId))
    const record = addInvoice({
      invoiceNumber,
      date,
      customerName: customer?.name ?? '',
      customerPhone: customer?.phone ?? '',
      items: validItems.map((it) => ({
        date: it.date,
        name: it.name.trim(),
        qty: toNumber(it.qty),
        price: toNumber(it.price),
      })),
      subtotal,
      discount: discountValue,
      total,
      note: note.trim(),
    })
    setSaved(record)
    setShowModal(true)
  }

  const reset = () => {
    setShowModal(false)
    setSubmitted(false)
    setCustomerId('')
    setItems([newItem()])
    setDiscount('')
    setNote('')
    setSaved(null)
  }

  return (
    <form onSubmit={handleSave} noValidate className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Buat Nota Baru</h1>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
              {invoiceNumber}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CustomerPicker
              customers={customers}
              value={customerId}
              onChange={setCustomerId}
              onAddCustomer={addCustomer}
            />
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Tanggal nota</span>
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-base font-semibold">Barang</h2>
          <p className="mb-3 text-xs text-slate-500">
            Tiap barang punya tanggal sendiri, jadi satu nota bisa mencakup beberapa hari.
          </p>
          <div className={`hidden gap-2 px-1 pb-1 text-xs font-medium uppercase text-slate-500 sm:grid ${ITEM_GRID}`}>
            <span>Tanggal</span>
            <span>Nama barang</span>
            <span>Jumlah</span>
            <span>Harga satuan</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>
          <div className="space-y-3">
            {items.map((it, i) => {
              const status = statuses[i]
              const invalid = status.state === 'invalid'
              const rowInput = invalid ? `${inputCls} border-red-400 bg-red-50` : inputCls
              return (
              <div key={it.id}>
              <div
                data-invalid={invalid || undefined}
                className={`grid grid-cols-2 gap-2 sm:items-center ${ITEM_GRID}`}
              >
                <input
                  className={`${rowInput} col-span-2 sm:col-span-1`}
                  type="date"
                  aria-label="Tanggal barang"
                  value={it.date}
                  onChange={(e) => updateItem(it.id, 'date', e.target.value)}
                />
                <input
                  className={`${rowInput} col-span-2 sm:col-span-1`}
                  placeholder="Nama barang"
                  value={it.name}
                  onChange={(e) => updateItem(it.id, 'name', e.target.value)}
                />
                <input
                  className={rowInput}
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Jml"
                  value={it.qty}
                  onChange={(e) => updateItem(it.id, 'qty', e.target.value)}
                />
                <input
                  className={rowInput}
                  type="number"
                  min="0"
                  placeholder="Harga"
                  value={it.price}
                  onChange={(e) => updateItem(it.id, 'price', e.target.value)}
                />
                <span
                  className={`text-right text-sm font-medium ${invalid ? 'text-slate-400 line-through' : ''}`}
                >
                  {formatRupiah(toNumber(it.qty) * toNumber(it.price))}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(it.id)}
                  disabled={items.length === 1}
                  aria-label="Hapus barang"
                  className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                >
                  ✕
                </button>
              </div>
              {invalid && (
                <p className="mt-1 text-xs text-red-600">
                  Tidak dihitung: {status.problems.join(', ')}.
                </p>
              )}
              </div>
              )
            })}
          </div>
          {invalidCount > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {invalidCount} baris belum lengkap dan dikecualikan dari total. Lengkapi atau hapus baris tersebut.
            </p>
          )}
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, newItem(prev[prev.length - 1]?.date)])}
            className="mt-4 rounded-lg border border-dashed border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
          >
            + Tambah Barang
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Catatan (opsional)</span>
            <textarea
              rows={2}
              className={inputCls}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mis. barang sudah diterima dalam kondisi baik"
            />
          </label>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h2 className="text-base font-semibold">Ringkasan</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Jumlah barang</dt>
            <dd>{validItems.length} jenis</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>{formatRupiah(subtotal)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500">Diskon</dt>
            <dd className="w-32">
              <input
                type="number"
                min="0"
                className={`${inputCls} text-right ${toNumber(discount) > subtotal ? 'border-amber-500 bg-amber-50' : ''}`}
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </dd>
          </div>
          {toNumber(discount) > subtotal && (
            <div className="text-xs text-amber-700">Diskon melebihi subtotal, dihitung maksimal {formatRupiah(subtotal)}.</div>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="text-indigo-700">{formatRupiah(total)}</dd>
          </div>
        </dl>
        <button
          type="submit"
          disabled={!!saved}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Simpan Nota
        </button>
        {submitted && errors.length > 0 && (
          <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            <p className="mb-1 font-semibold">Nota belum bisa disimpan:</p>
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {saved && (
          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            <p className="font-semibold">Nota {saved.invoiceNumber} tersimpan (data tiruan)</p>
            <p>Total {formatRupiah(saved.total)}</p>
            <button type="button" onClick={reset} className="mt-2 font-medium underline">
              Buat nota baru
            </button>
          </div>
        )}
      </aside>
      {saved && showModal && (
        <SavedInvoiceModal invoice={saved} onNew={reset} onClose={() => setShowModal(false)} />
      )}
    </form>
  )
}
