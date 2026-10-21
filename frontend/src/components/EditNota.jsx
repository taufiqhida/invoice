import { useState } from 'react'
import { formatRupiah, toNumber, todayISO, uid } from '../lib/format.js'

const ITEM_GRID = 'sm:grid-cols-[140px_1fr_64px_110px_100px_28px]'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

// Baris baru yang masih kosong diabaikan; baris lama dan baris terisi harus lengkap.
const isBlank = (r) => !r.id && !r.name.trim() && r.price === ''

const problemsOf = (r) => {
  const p = []
  if (!r.date) p.push('tanggal kosong')
  if (!r.name.trim()) p.push('nama barang kosong')
  if (toNumber(r.qty) <= 0) p.push('jumlah harus lebih dari 0')
  if (toNumber(r.price) <= 0) p.push('harga harus lebih dari 0')
  else if (!Number.isInteger(toNumber(r.price))) p.push('harga harus bilangan bulat (tanpa koma)')
  return p
}

// Form untuk membetulkan nota: ubah / tambah / hapus barang, diskon, catatan, tanggal nota.
// Tidak ada yang tersimpan sebelum "Simpan perubahan"; "Batal" membuang semuanya.
export default function EditNota({ invoice, onSave, onCancel, onDelete }) {
  const [rows, setRows] = useState(() =>
    invoice.items.map((it) => ({
      key: `item-${it.id}`,
      id: it.id,
      date: it.date,
      name: it.name,
      qty: String(it.qty),
      price: String(it.price),
    })),
  )
  const [date, setDate] = useState(invoice.date)
  const [discount, setDiscount] = useState(invoice.discount ? String(invoice.discount) : '')
  const [note, setNote] = useState(invoice.note)
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const problems = rows.map((r) => (isBlank(r) ? [] : problemsOf(r)))
  const active = rows.filter((r) => !isBlank(r))
  const invalidCount = problems.filter((p) => p.length > 0).length
  const subtotal = active.reduce((s, r) => s + Math.round(toNumber(r.qty) * toNumber(r.price)), 0)
  const discountValue = Math.min(toNumber(discount), subtotal)
  const total = subtotal - discountValue

  const errors = []
  if (!date) errors.push('Tanggal nota belum diisi.')
  if (active.length === 0) errors.push('Nota harus punya minimal satu barang. Untuk membuang seluruh nota, pakai tombol Hapus nota.')
  if (invalidCount > 0) errors.push(`${invalidCount} baris barang belum lengkap. Lengkapi atau hapus baris tersebut.`)
  if (toNumber(discount) < 0) errors.push('Diskon tidak boleh bernilai negatif.')
  else if (discount !== '' && !Number.isInteger(toNumber(discount))) errors.push('Diskon harus bilangan bulat (tanpa koma).')

  const update = (key, field, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  const remove = (key) => setRows((prev) => prev.filter((r) => r.key !== key))
  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { key: uid(), id: null, date: prev[prev.length - 1]?.date || todayISO(), name: '', qty: '1', price: '' },
    ])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    if (errors.length > 0 || busy) return
    setBusy(true)
    setError('')
    try {
      await onSave({
        date,
        items: active.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          date: r.date,
          name: r.name.trim(),
          qty: toNumber(r.qty),
          price: toNumber(r.price),
        })),
        discount: discount === '' ? 0 : toNumber(discount),
        note: note.trim(),
      })
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const askDelete = async () => {
    const ok = window.confirm(
      `Hapus seluruh nota ${invoice.invoiceNumber} milik ${invoice.customerName}?\n\nSemua barang di nota ini ikut terhapus dan tidak bisa dikembalikan.`,
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await onDelete()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-indigo-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold">Ubah nota {invoice.invoiceNumber}</h2>
        <p className="text-sm text-slate-500">
          {invoice.customerName}. Perubahan baru tersimpan setelah kamu klik <strong>Simpan perubahan</strong>.
        </p>
      </div>

      <label className="block sm:w-56">
        <span className="mb-1 block text-sm font-medium">Tanggal nota</span>
        <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <div>
        <div className={`hidden gap-2 px-1 pb-1 text-xs font-medium uppercase text-slate-500 sm:grid ${ITEM_GRID}`}>
          <span>Tanggal</span>
          <span>Nama barang</span>
          <span>Jumlah</span>
          <span>Harga satuan</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>
        <div className="space-y-3">
          {rows.map((r, i) => {
            const bad = problems[i].length > 0
            const rowInput = bad ? `${inputCls} border-red-400 bg-red-50` : inputCls
            return (
              <div key={r.key}>
                <div className={`grid grid-cols-2 gap-2 sm:items-center ${ITEM_GRID}`}>
                  <input
                    type="date"
                    aria-label="Tanggal barang"
                    className={`${rowInput} col-span-2 sm:col-span-1`}
                    value={r.date}
                    onChange={(e) => update(r.key, 'date', e.target.value)}
                  />
                  <input
                    aria-label="Nama barang"
                    className={`${rowInput} col-span-2 sm:col-span-1`}
                    placeholder="Nama barang"
                    value={r.name}
                    onChange={(e) => update(r.key, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label="Jumlah"
                    className={rowInput}
                    value={r.qty}
                    onChange={(e) => update(r.key, 'qty', e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    aria-label="Harga satuan"
                    className={rowInput}
                    placeholder="Harga"
                    value={r.price}
                    onChange={(e) => update(r.key, 'price', e.target.value)}
                  />
                  <span className={`text-right text-sm font-medium ${bad ? 'text-slate-400 line-through' : ''}`}>
                    {formatRupiah(Math.round(toNumber(r.qty) * toNumber(r.price)))}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(r.key)}
                    disabled={rows.length === 1}
                    aria-label="Hapus barang"
                    className="justify-self-end rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                  >
                    ✕
                  </button>
                </div>
                {bad && <p className="mt-1 text-xs text-red-600">Perlu dibetulkan: {problems[i].join(', ')}.</p>}
              </div>
            )
          })}
        </div>
        <button
          type="button"
          onClick={addRow}
          className="mt-4 rounded-lg border border-dashed border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
        >
          + Tambah Barang
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Catatan (opsional)</span>
          <textarea rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <dl className="space-y-2 text-sm">
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
                aria-label="Diskon"
                className={`${inputCls} text-right ${toNumber(discount) > subtotal ? 'border-amber-500 bg-amber-50' : ''}`}
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </dd>
          </div>
          {toNumber(discount) > subtotal && (
            <p className="text-xs text-amber-700">Diskon melebihi subtotal, dihitung maksimal {formatRupiah(subtotal)}.</p>
          )}
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="text-indigo-700">{formatRupiah(total)}</dd>
          </div>
        </dl>
      </div>

      {submitted && errors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <p className="mb-1 font-semibold">Perubahan belum bisa disimpan:</p>
          <ul className="list-disc space-y-0.5 pl-4">
            {errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busy ? 'Menyimpan…' : 'Simpan perubahan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={askDelete}
          disabled={busy}
          className="ml-auto rounded-lg px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          Hapus nota
        </button>
      </div>
    </form>
  )
}
