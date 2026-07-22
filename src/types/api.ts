export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data: T
  errors?: Record<string, string[]>
}

export interface PaginatedResponse<T> {
  success: boolean
  message: string
  data: {
    items: T[]
    pagination: {
      total: number
      per_page: number
      current_page: number
      last_page: number
      from: number | null
      to: number | null
    }
  }
}

export interface LoginResponse {
  user: User
  token: {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
  }
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  employee?: Employee
  employee_id?: number
  status: string
}

export interface Role {
  id: number
  name: string
}

export interface Employee {
  id: number
  nik: string
  name: string
  gender: string
  phone?: string
  email: string
  photo?: string
  department?: Department
  position?: Position
  schedule?: WorkSchedule
  is_active: boolean
}

export interface Department {
  id: number
  name: string
  description?: string
  is_active: boolean
}

export interface Position {
  id: number
  name: string
  description?: string
  role_id?: number
  role?: Role
  is_active: boolean
}

export interface WorkSchedule {
  id: number
  name: string
  start_time: string
  end_time: string
  working_days: string[]
  is_active: boolean
}

export interface AttendanceLocation {
  id: number
  location_name: string
  latitude: number
  longitude: number
  radius: number
  address?: string
  is_active: boolean
}

export interface Attendance {
  id: number
  employee_id: number
  employee?: Employee
  location?: AttendanceLocation
  schedule?: WorkSchedule
  attendance_type: string
  check_in_time?: string
  check_out_time?: string
  latitude?: number
  longitude?: number
  distance?: number
  face_score?: number
  face_status?: string
  location_status?: string
  attendance_status?: string
  device?: string
  ip_address?: string
  remarks?: string
  photo_path?: string
  photo_data?: string
  address?: string
  work_duration?: string
  created_at: string
}

export interface Notification {
  id: number
  title: string
  message: string
  type?: string
  is_read: boolean
  data?: Record<string, unknown>
  created_at: string
}
