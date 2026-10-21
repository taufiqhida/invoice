import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, getToken, onUnauthorized, setToken } from './api.js'
import { resetData } from './invoiceStore.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = sedang memeriksa sesi, null = belum login.
  const [user, setUser] = useState(getToken() ? undefined : null)

  useEffect(() => {
    if (user !== undefined) return
    api('/me')
      .then(setUser)
      .catch(() => setUser(null))
  }, [user])

  useEffect(
    () =>
      onUnauthorized(() => {
        resetData()
        setUser(null)
      }),
    [],
  )

  const login = useCallback(async (email, password) => {
    const { token, user: me } = await api('/login', { method: 'POST', body: { email, password } })
    setToken(token)
    resetData()
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    try {
      await api('/logout', { method: 'POST' })
    } catch {
      // Tetap keluar di sisi browser walau server tidak terjangkau.
    }
    setToken(null)
    resetData()
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
