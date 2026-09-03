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

function getCommit(): 'local' | 'session' | null {
  if (localStorage.getItem('access_token')) return 'local'
  if (sessionStorage.getItem('access_token')) return 'session'
  return null
}

function loadUser(): User | null {
  try {
    const cached = localStorage.getItem('user_profile') || sessionStorage.getItem('user_profile')
    return cached ? JSON.parse(cached) : null
  } catch { return null }
}

function persistUser(user: User, commit: 'local' | 'session') {
  const key = 'user_profile'
  if (commit === 'local') {
    localStorage.setItem(key, JSON.stringify(user))
    sessionStorage.removeItem(key)
  } else {
    sessionStorage.setItem(key, JSON.stringify(user))
    localStorage.removeItem(key)
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: getToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getToken(),
  setAuth: (user, token, refreshToken, remember = true) => {
    const commit: 'local' | 'session' = remember ? 'local' : 'session'
    const store = commit === 'local' ? localStorage : sessionStorage

    if (remember) localStorage.setItem('remember_me', '1')
    else {
      localStorage.removeItem('remember_me')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
    }

    store.setItem('access_token', token)
    store.setItem('refresh_token', refreshToken)
    persistUser(user, commit)
    set({ user, token, refreshToken, isAuthenticated: true })
  },
  setUser: (user) => {
    const commit = getCommit() ?? 'session'
    persistUser(user, commit)
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_profile')
    localStorage.removeItem('remember_me')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('user_profile')
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
  },
  updateUser: (user) => {
    const commit = getCommit() ?? 'session'
    persistUser(user, commit)
    set({ user })
  },
}))
