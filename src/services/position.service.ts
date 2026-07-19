import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, Position } from '@/types/api'

export const positionService = {
  getAll: async (params?: { page?: number; per_page?: number; search?: string }) => {
    const { data } = await api.get<PaginatedResponse<Position>>('/positions', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Position>>(`/positions/${id}`)
    return data.data
  },
  create: async (payload: Partial<Position>) => {
    const { data } = await api.post<ApiResponse<Position>>('/positions', payload)
    return data.data
  },
  update: async (id: number, payload: Partial<Position>) => {
    const { data } = await api.put<ApiResponse<Position>>(`/positions/${id}`, payload)
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/positions/${id}`)
  },
}
