import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api.js'

// Penyimpanan data nota di sisi browser, diisi dari API Laravel (MySQL).
// Halaman memuat ulang data tiap dibuka, jadi perubahan dari perangkat lain ikut terlihat.
let state = { invoices: null, customers: null, error: null }
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

// Status 'draft' = nota berjalan: masih terbuka dan boleh ditambah barang.
// 'terkirim' dan 'lunas' = nota tertutup; pembelian berikutnya membuat nota baru.
export const STATUS_LABEL = { draft: 'Berjalan', terkirim: 'Terkirim', lunas: 'Lunas' }
export const isOpen = (inv) => inv.status === 'draft'

// Satu pelanggan = satu nota berjalan. Bila ada, barang baru ditambahkan ke sana.
export const findOpenInvoice = (list, customerId) =>
  customerId === '' || customerId == null
    ? undefined
    : list.find((i) => String(i.customerId) === String(customerId) && isOpen(i))

let inflight = null
export function loadAll() {
  inflight ??= Promise.all([api('/invoices'), api('/customers')])
    .then(([invoices, customers]) => set({ invoices, customers, error: null }))
    .catch((e) => set({ error: e.message }))
    .finally(() => {
      inflight = null
    })
  return inflight
}

export const resetData = () => set({ invoices: null, customers: null, error: null })

function useData() {
  const s = useSyncExternalStore(subscribe, getState)
  useEffect(() => {
    loadAll()
  }, [])
  return { ...s, loading: (s.invoices === null || s.customers === null) && !s.error, reload: loadAll }
}

export function useInvoices() {
  const { invoices, loading, error, reload } = useData()
  return { invoices: invoices ?? [], loading, error, reload }
}

export function useCustomers() {
  const { customers, loading, error } = useData()
  return { customers: customers ?? [], loading, error }
}

export function useInvoice(id) {
  const { invoices, loading, error } = useInvoices()
  return { invoice: invoices.find((i) => String(i.id) === String(id)), loading, error }
}

const upsertInvoice = (inv) =>
  set({ invoices: [inv, ...(state.invoices ?? []).filter((i) => i.id !== inv.id)].sort((a, b) => b.id - a.id) })

// Simpan barang. Server memutuskan: tambah ke nota berjalan pelanggan itu, atau buat nota baru.
// `appended` = jumlah barang yang ditambahkan ke nota lama (0 = nota baru).
export async function saveInvoice(payload) {
  const { invoice, appended } = await api('/invoices', { method: 'POST', body: payload })
  upsertInvoice(invoice)
  return { invoice, appended }
}

export async function setInvoiceStatus(id, status) {
  const invoice = await api(`/invoices/${id}`, { method: 'PATCH', body: { status } })
  upsertInvoice(invoice)
  return invoice
}

export async function addCustomer(data) {
  const created = await api('/customers', { method: 'POST', body: data })
  set({ customers: [...(state.customers ?? []), created].sort((a, b) => a.name.localeCompare(b.name)) })
  return created
}
