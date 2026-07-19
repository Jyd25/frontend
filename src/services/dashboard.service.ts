import api from '@/lib/axios'

interface DashboardStats {
  total_employees: number
  today_present: number
  today_late: number
  today_absent: number
  today_leave: number
  today_permission: number
  today_sick: number
}

interface DailyStat {
  date: string
  present: number
  late: number
  absent: number
}

export const dashboardService = {
  getStats: async () => {
    const { data } = await api.get<{ success: boolean; data: DashboardStats }>('/dashboard')
    return data.data
  },
  getWeekly: async () => {
    const { data } = await api.get<{ success: boolean; data: DailyStat[] }>('/dashboard/weekly')
    return data.data
  },
  getMonthly: async () => {
    const { data } = await api.get<{ success: boolean; data: any }>('/dashboard/monthly')
    return data.data
  },
}
