import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, AttendanceLocation } from '@/types/api'

export const locationService = {
  getAll: async (params?: { page?: number; per_page?: number; search?: string }) => {
    const { data } = await api.get<PaginatedResponse<AttendanceLocation>>('/locations', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<AttendanceLocation>>(`/locations/${id}`)
    return data.data
  },
  create: async (payload: Partial<AttendanceLocation>) => {
    const { data } = await api.post<ApiResponse<AttendanceLocation>>('/locations', payload)
    return data.data
  },
  update: async (id: number, payload: Partial<AttendanceLocation>) => {
    const { data } = await api.put<ApiResponse<AttendanceLocation>>(`/locations/${id}`, payload)
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/locations/${id}`)
  },
}
