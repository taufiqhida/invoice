import { useEffect, useSyncExternalStore } from 'react'
import { api } from './api.js'

// Profil toko (nama, alamat, telepon) dari server. Dibaca publik, jadi juga tampil di halaman login.
const FALLBACK = { name: 'Nota Toko', address: '', phone: '' }

let profile = null
const listeners = new Set()
const set = (p) => {
  profile = p
  listeners.forEach((l) => l())
}
const subscribe = (l) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

let inflight = null
function load() {
  inflight ??= api('/store')
    .then(set)
    .catch(() => {
      // Tetap pakai nilai bawaan; dicoba lagi saat halaman lain dibuka.
    })
    .finally(() => {
      inflight = null
    })
  return inflight
}

/** `loaded` false selama profil belum diterima dari server (nama sementara dipakai). */
export function useStoreProfile() {
  const current = useSyncExternalStore(subscribe, () => profile)
  useEffect(() => {
    if (current === null) load()
  }, [current])
  return { ...(current ?? FALLBACK), loaded: current !== null }
}

export async function updateStoreProfile(data) {
  const updated = await api('/store', { method: 'PUT', body: data })
  set(updated)
  return updated
}
