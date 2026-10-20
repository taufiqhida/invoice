const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export const formatRupiah = (n) => rupiah.format(Number.isFinite(n) ? n : 0)

export const toNumber = (v) => {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

// "2026-10-19" -> "Senin, 19 Oktober 2026"
export const formatDayDate = (iso) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

// ID unik untuk baris di UI. crypto.randomUUID() hanya ada di HTTPS/localhost, jadi pakai penghitung sederhana.
let uidCounter = 0
export const uid = () => `row-${Date.now().toString(36)}-${(uidCounter++).toString(36)}`

export const todayISO = () => new Date().toISOString().slice(0, 10)
