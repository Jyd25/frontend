import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, User } from '@/types/api'

export interface UserQuery {
  page?: number
  per_page?: number
  search?: string
  role_id?: number
  status?: string
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
  role_id: number
  employee_id?: number | null
  status?: string
}

export interface UpdateUserPayload extends Partial<CreateUserPayload> {
  password?: string
  password_confirmation?: string
}

export const userService = {
  getAll: async (params?: UserQuery) => {
    const { data } = await api.get<PaginatedResponse<User>>('/users', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<User>>(`/users/${id}`)
    return data.data
  },
  create: async (payload: CreateUserPayload) => {
    const { data } = await api.post<ApiResponse<User>>('/users', payload)
    return data.data
  },
  update: async (id: number, payload: UpdateUserPayload) => {
    const { data } = await api.put<ApiResponse<User>>(`/users/${id}`, payload)
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/users/${id}`)
  },
}
