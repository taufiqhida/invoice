import { useSyncExternalStore } from 'react'
import { formatInvoiceNumber, mockCustomers } from './data.js'

// Store tiruan di memori (hilang saat reload). Diganti API Laravel pada fase backend.
const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const seed = [
  { c: 1, d: 6, total: 125000, status: 'lunas' },
  { c: 3, d: 5, total: 860000, status: 'lunas' },
  { c: 2, d: 3, total: 45000, status: 'terkirim' },
  { c: 4, d: 1, total: 232500, status: 'draft' },
  { c: 1, d: 0, total: 78000, status: 'terkirim' },
].map((s, i) => {
  const customer = mockCustomers.find((c) => c.id === s.c)
  return {
    id: i + 1,
    invoiceNumber: formatInvoiceNumber(i + 1),
    date: daysAgo(s.d),
    customerName: customer.name,
    customerPhone: customer.phone,
    items: [{ name: 'Pembelian barang', qty: 1, price: s.total }],
    subtotal: s.total,
    discount: 0,
    total: s.total,
    note: '',
    status: s.status,
  }
})

// Contoh nota multi-hari. Harga gula/garam hanya contoh, silakan ubah.
const multiDayItems = [
  { date: '2026-10-19', name: 'Gula', qty: 2, price: 15000 },
  { date: '2026-10-20', name: 'Gula', qty: 4, price: 15000 },
  { date: '2026-10-21', name: 'Gula', qty: 2, price: 15000 },
  { date: '2026-10-21', name: 'Garam', qty: 3, price: 5000 },
]
const multiDayTotal = multiDayItems.reduce((s, it) => s + it.qty * it.price, 0)
seed.push({
  id: seed.length + 1,
  invoiceNumber: formatInvoiceNumber(seed.length + 1),
  date: '2026-10-21',
  customerName: mockCustomers[0].name,
  customerPhone: mockCustomers[0].phone,
  items: multiDayItems,
  subtotal: multiDayTotal,
  discount: 0,
  total: multiDayTotal,
  note: '',
  status: 'draft',
})

let invoices = seed
const listeners = new Set()

export const addInvoice = (inv) => {
  const record = { ...inv, id: invoices.length + 1, status: 'draft' }
  invoices = [...invoices, record]
  listeners.forEach((l) => l())
  return record
}

const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useInvoices = () => useSyncExternalStore(subscribe, () => invoices)
export const useInvoice = (id) => useInvoices().find((i) => String(i.id) === String(id))
