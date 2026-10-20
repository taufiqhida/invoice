// Data tiruan — akan diganti panggilan API Laravel pada fase backend.
export const mockCustomers = [
  { id: 1, name: 'Budi Santoso', phone: '081234567890' },
  { id: 2, name: 'Siti Aminah', phone: '082198765432' },
  { id: 3, name: 'Toko Maju Jaya', phone: '085611223344' },
  { id: 4, name: 'Rina Wulandari', phone: '087855667788' },
]

// Profil toko tiruan — fase 3 (Profil Toko) akan mengambilnya dari tabel `stores`.
export const mockStore = {
  name: 'Toko Saya',
  address: 'Jl. Merdeka No. 12, Kota Contoh',
  phone: '0812-3456-7890',
  logoPath: null,
}

// Nomor nota otomatis (tiruan): NOTA-YYYYMM-0001, naik 1 per nota tersimpan.
export function formatInvoiceNumber(seq, date = new Date()) {
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  return `NOTA-${ym}-${String(seq).padStart(4, '0')}`
}
