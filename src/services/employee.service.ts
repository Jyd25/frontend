import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, Employee } from '@/types/api'

interface EmployeeQuery {
  page?: number
  per_page?: number
  search?: string
  department_id?: number
  is_active?: boolean
}

export const employeeService = {
  getAll: async (params?: EmployeeQuery) => {
    const { data } = await api.get<PaginatedResponse<Employee>>('/employees', { params })
    return data
  },
  getById: async (id: number) => {
    const { data } = await api.get<ApiResponse<Employee>>(`/employees/${id}`)
    return data.data
  },
  create: async (formData: FormData) => {
    const { data } = await api.post<ApiResponse<Employee>>('/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  update: async (id: number, formData: FormData) => {
    formData.append('_method', 'PUT')
    const { data } = await api.post<ApiResponse<Employee>>(`/employees/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },
  delete: async (id: number) => {
    await api.delete(`/employees/${id}`)
  },
}
