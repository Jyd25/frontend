import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'

export interface Holiday {
  id: number
  name: string
  date: string
  type: 'national' | 'collective'
  description?: string | null
}

export interface HolidayToday {
  date: string
  is_non_working_day: boolean
  reason: 'sunday' | 'holiday' | null
  name: string | null
}

export interface HolidayPayload {
  name: string
  date: string
  type: 'national' | 'collective'
  description?: string | null
}

export const holidayService = {
  getAll: async (params?: {
    month?: number
    year?: number
    start_date?: string
    end_date?: string
    paginate?: boolean
    per_page?: number
    page?: number
  }): Promise<Holiday[]> => {
    const { data } = await api.get<any>('/holidays', { params })
    const payload = data?.data
    return Array.isArray(payload) ? payload : payload?.items ?? []
  },
  getToday: async () => {
    const { data } = await api.get<ApiResponse<HolidayToday>>('/holidays/today')
    return data.data
  },
  create: async (payload: HolidayPayload) => {
    const { data } = await api.post<ApiResponse<Holiday>>('/holidays', payload)
    return data.data
  },
  update: async (id: number, payload: HolidayPayload) => {
    const { data } = await api.put<ApiResponse<Holiday>>(`/holidays/${id}`, payload)
    return data.data
  },
  remove: async (id: number) => {
    await api.delete(`/holidays/${id}`)
  },
}
