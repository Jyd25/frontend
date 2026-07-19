import api from '@/lib/axios'
import type { ApiResponse, User } from '@/types/api'

interface LoginData {
  user: User
  token: {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

export const authService = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<ApiResponse<LoginData>>('/auth/login', { email, password })
    return data.data
  },
  logout: async () => {
    await api.post('/auth/logout')
  },
  getProfile: async () => {
    const { data } = await api.get<ApiResponse<User>>('/auth/profile')
    return data.data
  },
  changePassword: async (current_password: string, new_password: string, new_password_confirmation: string) => {
    const { data } = await api.put<ApiResponse>('/auth/change-password', { current_password, new_password, new_password_confirmation })
    return data
  },
  updateProfile: async (payload: { name?: string; email?: string }) => {
    const { data } = await api.put<ApiResponse<User>>('/auth/profile', payload)
    return data.data
  },
}
