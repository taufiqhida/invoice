import { useMemo, useState } from 'react'
import { formatRupiah, toNumber } from '../lib/format.js'
import { useInvoices } from '../lib/invoiceStore.js'
import { productKey, removePrice, removeSupplier, savePrice, useSuppliers } from '../lib/supplierStore.js'

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

// Daftar harga beli (modal) per barang di tiap toko, mis. Gula: Toko A 17.000, Toko B 22.000, Toko C 25.000.
// Di form nota, harga ini muncul sebagai tombol sekali klik; untung dihitung dari selisih harga jual dan harga beli.
export default function HargaBeli() {
  const { suppliers, loading, error, reload } = useSuppliers()
  const { invoices } = useInvoices()
  const [product, setProduct] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')

  // Kelompokkan per barang: satu kartu per barang, berisi harga di tiap toko (termurah dulu).
  const products = useMemo(() => {
    const map = new Map()
    for (const s of suppliers) {
      for (const p of s.prices) {
        if (!map.has(p.productKey)) map.set(p.productKey, { key: p.productKey, name: p.product, rows: [] })
        map.get(p.productKey).rows.push({ id: p.id, supplierId: s.id, supplierName: s.name, price: p.price })
      }
    }
    return [...map.values()]
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => a.price - b.price || a.supplierName.localeCompare(b.supplierName)) }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [suppliers])

  // Saran nama barang dari nota yang pernah dibuat dan daftar harga, supaya ejaannya konsisten.
  const productNames = useMemo(() => {
    const seen = new Map()
    for (const inv of invoices) for (const it of inv.items) if (!seen.has(productKey(it.name))) seen.set(productKey(it.name), it.name)
    for (const g of products) if (!seen.has(g.key)) seen.set(g.key, g.name)
    return [...seen.values()].sort((a, b) => a.localeCompare(b))
  }, [invoices, products])

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    setNotice('')
    if (!product.trim()) return setFormError('Nama barang wajib diisi.')
    if (!supplierName.trim()) return setFormError('Nama toko wajib diisi.')
    if (price === '' || toNumber(price) < 0 || !Number.isInteger(toNumber(price))) {
      return setFormError('Harga beli harus bilangan bulat (tanpa koma), tidak negatif.')
    }
    setBusy(true)
    try {
      await savePrice({ supplierName: supplierName.trim(), product: product.trim(), price: toNumber(price) })
      setNotice(`Tersimpan: ${product.trim()} di ${supplierName.trim()} ${formatRupiah(toNumber(price))}.`)
      setPrice('')
    } catch (err) {
      setFormError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const edit = (g, r) => {
    setProduct(g.name)
    setSupplierName(r.supplierName)
    setPrice(String(r.price))
    setFormError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const run = async (fn) => {
    setFormError('')
    setNotice('')
    try {
      await fn()
    } catch (err) {
      setFormError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-semibold">Harga Beli (Modal)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catat harga beli satu barang di tiap toko. Saat membuat nota, tinggal klik toko tempat kamu membeli, lalu
          untung terhitung otomatis. Modal tidak pernah tercetak di nota pelanggan.
        </p>

        <form onSubmit={submit} noValidate className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_140px_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Barang</span>
            <input
              className={inputCls}
              list="nama-barang"
              placeholder="Mis. Gula"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Beli di toko</span>
            <input
              className={inputCls}
              list="nama-toko"
              placeholder="Mis. Toko A"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Harga beli satuan</span>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="17000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-slate-300"
          >
            {busy ? 'Menyimpan…' : 'Simpan harga'}
          </button>
          <datalist id="nama-barang">
            {productNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <datalist id="nama-toko">
            {suppliers.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Toko baru dibuat otomatis. Menyimpan lagi barang dan toko yang sama akan mengganti harga lamanya.
        </p>
        {formError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {formError}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            {notice}
          </p>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Data belum bisa dimuat: {error}{' '}
          <button type="button" onClick={reload} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      )}
      {loading && <p className="text-sm text-slate-500">Memuat daftar harga…</p>}
      {!loading && !error && products.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada harga beli. Isi formulir di atas, misalnya Gula di Toko A Rp 17.000.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {products.map((g) => (
          <section key={g.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">{g.name}</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {g.rows.map((r, i) => (
                <li key={r.id} className="flex items-center gap-2 py-2">
                  <span className="flex-1">
                    {r.supplierName}
                    {i === 0 && g.rows.length > 1 && (
                      <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        termurah
                      </span>
                    )}
                  </span>
                  <span className="font-medium">{formatRupiah(r.price)}</span>
                  <button
                    type="button"
                    onClick={() => edit(g, r)}
                    className="rounded px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    aria-label={`Hapus harga ${g.name} di ${r.supplierName}`}
                    onClick={() => run(() => removePrice(r.id))}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {suppliers.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold">Daftar toko</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm">
                {s.name} <span className="text-xs text-slate-400">({s.prices.length} barang)</span>
                <button
                  type="button"
                  aria-label={`Hapus toko ${s.name}`}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Hapus toko "${s.name}" beserta ${s.prices.length} harga belinya?\n\nNota lama tetap menyimpan nama toko dan harga belinya.`,
                      )
                    ) {
                      run(() => removeSupplier(s.id))
                    }
                  }}
                  className="rounded-full px-2 py-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
