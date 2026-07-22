import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, Attendance } from '@/types/api'

export const attendanceService = {
  getToday: async () => {
    const { data } = await api.get<ApiResponse<Attendance | null>>('/attendances/today')
    return data.data
  },
  checkIn: async (payload: {
    latitude: number;
    longitude: number;
    location_id?: number;
    face_score?: number;
    face_status?: string;
    photo_data?: string;
    address?: string;
  }) => {
    const { data } = await api.post<ApiResponse<Attendance>>('/attendances/check-in', payload)
    return data.data
  },
  checkOut: async (payload?: {
    face_score?: number;
    face_status?: string;
    photo_data?: string;
    latitude?: number;
    longitude?: number;
    location_id?: number;
    address?: string;
  }) => {
    const { data } = await api.post<ApiResponse<Attendance>>('/attendances/check-out', payload || {})
    return data.data
  },
  getAll: async (params?: {
    page?: number
    per_page?: number
    date?: string
    month?: number
    year?: number
    employee_id?: number
    department_id?: number
    status?: string
    search?: string
  }) => {
    const { data } = await api.get<PaginatedResponse<Attendance>>('/attendances', { params })
    return data
  },
  getHistory: async (params?: {
    page?: number
    per_page?: number
    start_date?: string
    end_date?: string
  }) => {
    const { data } = await api.get<PaginatedResponse<Attendance>>('/attendances/history', { params })
    return data
  },
  update: async (id: number, payload: {
    check_in_time?: string | null
    check_out_time?: string | null
  }) => {
    const { data } = await api.put<ApiResponse<Attendance>>(`/attendances/${id}`, payload)
    return data.data
  },
}
