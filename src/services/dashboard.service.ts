import api from '@/lib/axios'

interface AttendanceListItem {
  employee_id: number
  name: string
  nik: string
  department: string
  status: string
  check_in_time?: string
  check_out_time?: string
  late_minutes?: number
}

interface MyAttendance {
  status: string
  check_in_time?: string
  check_out_time?: string
  location_status?: string
  face_status?: string
  status_checkout?: string
}

interface ScheduleInfo {
  name?: string
  start_time?: string
  end_time?: string
  break_start?: string
  break_end?: string
  tolerance_minutes?: number
  working_days?: number[]
  presensi_start?: string
  presensi_deadline?: string
}

interface DashboardStats {
  total_employees: number
  today_present: number
  today_late: number
  today_absent: number
  today_leave: number
  today_permission: number
  today_sick: number
  today_attendance_list?: AttendanceListItem[]
  today_absent_list?: AttendanceListItem[]
  my_attendance?: MyAttendance | null
  schedule?: ScheduleInfo
  current_time?: string
  current_date?: string
  day_name?: string
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
