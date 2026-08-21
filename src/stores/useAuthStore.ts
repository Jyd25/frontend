import { create } from 'zustand'
import type { User } from '@/types/api'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken: string, remember?: boolean) => void
  setUser: (user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

function getToken(): string | null {
  return localStorage.getItem('access_token') || sessionStorage.getItem('access_token')
}

function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token') || sessionStorage.getItem('refresh_token')
}

function loadUser(): User | null {
  try {
    const cached = sessionStorage.getItem('user_profile')
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: getToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getToken(),
  setAuth: (user, token, refreshToken, remember = true) => {
    const store = remember ? localStorage : sessionStorage
    store.setItem('access_token', token)
    store.setItem('refresh_token', refreshToken)
    sessionStorage.setItem('user_profile', JSON.stringify(user))
    set({ user, token, refreshToken, isAuthenticated: true })
  },
  setUser: (user) => {
    sessionStorage.setItem('user_profile', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.clear()
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
  },
  updateUser: (user) => {
    sessionStorage.setItem('user_profile', JSON.stringify(user))
    set({ user })
  },
}))
