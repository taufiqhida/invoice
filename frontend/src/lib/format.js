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

export const todayISO = () => new Date().toISOString().slice(0, 10)
