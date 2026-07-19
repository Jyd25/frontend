import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, WorkSchedule } from '@/types/api'

export const scheduleService = {
  getAll: async (params?: { page?: number; per_page?: number; search?: string }) => {
    const { data } = await api.get<PaginatedResponse<WorkSchedule>>('/schedules', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<WorkSchedule>>(`/schedules/${id}`)
    return data.data
  },
  create: async (payload: Partial<WorkSchedule>) => {
    const { data } = await api.post<ApiResponse<WorkSchedule>>('/schedules', payload)
    return data.data
  },
  update: async (id: number, payload: Partial<WorkSchedule>) => {
    const { data } = await api.put<ApiResponse<WorkSchedule>>(`/schedules/${id}`, payload)
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/schedules/${id}`)
  },
}
