import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, Department } from '@/types/api'

export const departmentService = {
  getAll: async (params?: { page?: number; per_page?: number; search?: string }) => {
    const { data } = await api.get<PaginatedResponse<Department>>('/departments', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Department>>(`/departments/${id}`)
    return data.data
  },
  create: async (payload: Partial<Department>) => {
    const { data } = await api.post<ApiResponse<Department>>('/departments', payload)
    return data.data
  },
  update: async (id: number, payload: Partial<Department>) => {
    const { data } = await api.put<ApiResponse<Department>>(`/departments/${id}`, payload)
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/departments/${id}`)
  },
}
