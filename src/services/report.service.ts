import api from '@/lib/axios'

export const reportService = {
  getDaily: async (params?: { date?: string; department_id?: number }) => {
    const { data } = await api.get('/reports/daily', { params })
    return data.data
  },
  getMonthly: async (params?: { month?: number; year?: number; department_id?: number }) => {
    const { data } = await api.get('/reports/monthly', { params })
    return data.data
  },
  getEmployee: async (params: { employee_id: number; start_date?: string; end_date?: string }) => {
    const { data } = await api.get('/reports/employee', { params })
    return data.data
  },
  getDepartment: async (params?: { department_id?: number; month?: number; year?: number }) => {
    const { data } = await api.get('/reports/department', { params })
    return data.data
  },
}
