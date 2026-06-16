'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { authApi } from '../api/client'
import type { AuthUser } from '../types'

interface AuthCtx { user: AuthUser | null; login: (e: string, p: string) => Promise<void>; logout: () => void; loading: boolean }
const Ctx = createContext<AuthCtx>({ user: null, login: async () => {}, logout: () => {}, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('tfg_token')
    if (token) {
      authApi.me().then(setUser).catch(() => { Cookies.remove('tfg_token'); setUser(null) }).finally(() => setLoading(false))
    } else { setLoading(false) }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    Cookies.set('tfg_token', res.accessToken, { expires: 1, sameSite: 'strict' })
    setUser(res.user)
    router.push('/admin/dashboard')
  }

  const logout = () => {
    Cookies.remove('tfg_token')
    setUser(null)
    router.push('/auth/login')
  }

  return <Ctx.Provider value={{ user, login, logout, loading }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
