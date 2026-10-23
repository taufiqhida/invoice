import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api.js'

// Daftar toko tempat membeli barang + harga belinya per barang (modal). Diisi dari API Laravel.
let state = { suppliers: null, error: null }
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const getState = () => state

let inflight = null
export function loadSuppliers() {
  inflight ??= api('/suppliers')
    .then((suppliers) => set({ suppliers, error: null }))
    .catch((e) => set({ error: e.message }))
    .finally(() => {
      inflight = null
    })
  return inflight
}

export const resetSuppliers = () => set({ suppliers: null, error: null })

export function useSuppliers() {
  const s = useSyncExternalStore(subscribe, getState)
  useEffect(() => {
    loadSuppliers()
  }, [])
  return {
    suppliers: s.suppliers ?? [],
    loading: s.suppliers === null && !s.error,
    error: s.error,
    reload: loadSuppliers,
  }
}

// Sama dengan SupplierPrice::keyFor di backend: "Gula" dan " gula " dianggap barang yang sama.
export const productKey = (name) => String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

// Harga beli tersimpan untuk satu barang di semua toko, termurah dulu.
export function priceOptions(suppliers, productName) {
  const key = productKey(productName)
  if (!key) return []
  return suppliers
    .flatMap((s) => s.prices.filter((p) => p.productKey === key).map((p) => ({ supplierId: s.id, supplierName: s.name, price: p.price })))
    .sort((a, b) => a.price - b.price || a.supplierName.localeCompare(b.supplierName))
}

const replaceSupplier = (updated) =>
  set({
    suppliers: [...(state.suppliers ?? []).filter((s) => s.id !== updated.id), updated].sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  })

// Simpan harga beli satu barang di satu toko (toko dibuat otomatis bila belum ada).
export async function savePrice({ supplierName, product, price }) {
  const updated = await api('/supplier-prices', {
    method: 'PUT',
    body: { supplier_name: supplierName, product, price },
  })
  replaceSupplier(updated)
  return updated
}

export async function removePrice(id) {
  replaceSupplier(await api(`/supplier-prices/${id}`, { method: 'DELETE' }))
}

export async function removeSupplier(id) {
  await api(`/suppliers/${id}`, { method: 'DELETE' })
  set({ suppliers: (state.suppliers ?? []).filter((s) => s.id !== id) })
}
