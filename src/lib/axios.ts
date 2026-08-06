import axios, { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('access_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RetriableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean
}

let refreshPromise: Promise<string> | null = null
let redirectingToLogin = false

function forceLogout() {
  if (redirectingToLogin) return
  redirectingToLogin = true
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
  sessionStorage.clear()
  window.location.href = '/login'
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequest | undefined
    const isAuthExpired = error.response?.status === 401

    if (isAuthExpired && originalRequest && !originalRequest._retry && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const refreshToken = localStorage.getItem('refresh_token')
            if (!refreshToken) throw new Error('No refresh token available')
            const { data } = await api.post<{ data: { token: { access_token: string } } }>(
              '/auth/refresh',
              {},
              { headers: { Authorization: `Bearer ${refreshToken}` } }
            )
            const token = data.data.token.access_token
            localStorage.setItem('access_token', token)
            localStorage.setItem('refresh_token', token)
            return token
          })().finally(() => {
            refreshPromise = null
          })
        }
        const token = await refreshPromise
        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)
      } catch {
        forceLogout()
      }
    }
    return Promise.reject(error)
  }
)

export default api
