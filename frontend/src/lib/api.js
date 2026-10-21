// Klien API Laravel. Token login disimpan di localStorage dan dikirim sebagai Bearer.
const TOKEN_KEY = 'nota.token'

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Mode privat / penyimpanan diblokir: login hanya berlaku selama halaman terbuka.
  }
}

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

// Dipanggil saat server menjawab 401 (token kedaluwarsa / dicabut) agar UI kembali ke halaman login.
const unauthorizedListeners = new Set()
export const onUnauthorized = (fn) => {
  unauthorizedListeners.add(fn)
  return () => unauthorizedListeners.delete(fn)
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Tidak bisa terhubung ke server. Periksa koneksi internet lalu coba lagi.', 0)
  }

  if (res.status === 401 && path !== '/login') {
    setToken(null)
    unauthorizedListeners.forEach((fn) => fn())
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const errors = data?.errors ?? null
    const firstError = errors ? Object.values(errors)[0]?.[0] : null
    throw new ApiError(firstError || data?.message || `Terjadi kesalahan di server (${res.status}).`, res.status, errors)
  }
  return data
}
