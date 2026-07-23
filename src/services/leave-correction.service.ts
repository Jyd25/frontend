import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse } from '@/types/api'

export interface LeaveRequest {
  id: number
  employee_id: number
  approved_by?: number
  type: 'permission' | 'sick' | 'leave'
  start_date: string
  end_date: string
  reason: string
  attachment?: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note?: string
  employee?: { id: number; name: string; nik: string }
  approver?: { id: number; name: string }
  created_at: string
}

export interface AttendanceCorrection {
  id: number
  employee_id: number
  attendance_id?: number
  approved_by?: number
  date: string
  check_in_time?: string
  check_out_time?: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note?: string
  employee?: { id: number; name: string; nik: string }
  approver?: { id: number; name: string }
  attendance?: { id: number; check_in_time: string; check_out_time: string }
  created_at: string
}

export interface ExportData {
  title: string
  period: string
  items: {
    name: string
    nik: string
    department: string
    position: string
    records: {
      date: string
      check_in: string
      check_out: string
      status: string
      status_checkout?: string
      checkin_address?: string
      checkout_address?: string
      location: string
      face: string
      remarks?: string
    }[]
  }[]
}

export const leaveService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get<PaginatedResponse<LeaveRequest>>('/leaves', { params })
    return data
  },
  create: async (payload: { type: string; start_date: string; end_date: string; reason: string }) => {
    const { data } = await api.post<ApiResponse<LeaveRequest>>('/leaves', payload)
    return data.data
  },
  approve: async (id: number, admin_note?: string) => {
    const { data } = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/approve`, { admin_note })
    return data.data
  },
  reject: async (id: number, admin_note: string) => {
    const { data } = await api.post<ApiResponse<LeaveRequest>>(`/leaves/${id}/reject`, { admin_note })
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/leaves/${id}`)
  },
}

export const correctionService = {
  getAll: async (params?: Record<string, any>) => {
    const { data } = await api.get<PaginatedResponse<AttendanceCorrection>>('/corrections', { params })
    return data
  },
  create: async (payload: { date: string; check_in_time?: string; check_out_time?: string; reason: string }) => {
    const { data } = await api.post<ApiResponse<AttendanceCorrection>>('/corrections', payload)
    return data.data
  },
  approve: async (id: number, admin_note?: string) => {
    const { data } = await api.post<ApiResponse<AttendanceCorrection>>(`/corrections/${id}/approve`, { admin_note })
    return data.data
  },
  reject: async (id: number, admin_note: string) => {
    const { data } = await api.post<ApiResponse<AttendanceCorrection>>(`/corrections/${id}/reject`, { admin_note })
    return data.data
  },
}

export const exportService = {
  getAttendance: async (params: { start_date: string; end_date: string; department_id?: number; format: string }) => {
    const { data } = await api.get<ApiResponse<ExportData>>('/export/attendance', { params })
    return data.data
  },
}
