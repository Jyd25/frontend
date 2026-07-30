import { create } from 'zustand'
import type { User } from '@/types/api'

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, token: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
  updateUser: (user: User) => void
}

function loadUser(): User | null {
  try {
    const cached = sessionStorage.getItem('user_profile')
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('access_token', token)
    localStorage.setItem('refresh_token', refreshToken)
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
    sessionStorage.clear()
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
  },
  updateUser: (user) => {
    sessionStorage.setItem('user_profile', JSON.stringify(user))
    set({ user })
  },
}))
