import { formatRupiah, toNumber } from '../lib/format.js'
import { priceOptions } from '../lib/supplierStore.js'

const smallInput =
  'rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

// Baris modal di bawah tiap barang: beli dari toko mana dan berapa harga belinya.
// Hanya untuk pemilik: tidak ikut tercetak di nota maupun halaman verifikasi.
// Mengisi harga beli dari daftar harga toko dengan sekali klik; untung per barang tampil langsung.
export default function ItemCost({ name, qty, price, supplierId, cost, suppliers, onChange }) {
  const options = priceOptions(suppliers, name)
  const cheapest = options[0]?.price
  const costNum = toNumber(cost)
  const hasCost = cost !== '' && cost != null
  const profit = hasCost ? Math.round(toNumber(qty) * (toNumber(price) - costNum)) : null

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg bg-slate-50 px-2.5 py-2 text-xs text-slate-600 print:hidden">
      <span className="font-medium text-slate-500">Modal</span>

      {options.map((o) => {
        const active = String(o.supplierId) === String(supplierId) && String(o.price) === String(cost)
        return (
          <button
            key={o.supplierId}
            type="button"
            onClick={() => onChange({ supplierId: String(o.supplierId), cost: String(o.price) })}
            className={`rounded-full border px-2.5 py-1 ${
              active
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400'
            }`}
            title={o.price === cheapest ? 'Harga termurah' : undefined}
          >
            {o.supplierName} {formatRupiah(o.price)}
            {o.price === cheapest && options.length > 1 ? ' ★' : ''}
          </button>
        )
      })}

      <select
        aria-label="Beli dari toko"
        className={smallInput}
        value={supplierId}
        onChange={(e) => {
          const id = e.target.value
          const match = options.find((o) => String(o.supplierId) === id)
          // Pilih toko yang punya harga tersimpan -> harga ikut terisi; selain itu biarkan harga yang sudah diketik.
          onChange({ supplierId: id, cost: match ? String(match.price) : cost })
        }}
      >
        <option value="">Toko: —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-1">
        Harga beli
        <input
          type="number"
          min="0"
          aria-label="Harga beli satuan"
          className={`${smallInput} w-24`}
          placeholder="0"
          value={cost}
          onChange={(e) => onChange({ supplierId, cost: e.target.value })}
        />
      </label>

      {profit !== null && (
        <span className={`ml-auto font-semibold ${profit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
          {profit < 0 ? 'Rugi' : 'Untung'} {formatRupiah(Math.abs(profit))}
        </span>
      )}
      {options.length === 0 && !hasCost && (
        <span className="text-slate-400">Belum ada harga beli tersimpan untuk barang ini (atur di menu Harga Beli).</span>
      )}
    </div>
  )
}
