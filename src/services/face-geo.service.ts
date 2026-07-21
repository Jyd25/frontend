import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'

export interface FaceDataset {
  id: number
  employee_id: number
  image_path: string | null
  is_primary: boolean
  created_at: string
}

export interface VerifyResult {
  matched: boolean
  message: string
  score: number
  distance: number
  threshold: number
}

export interface GeolocationResult {
  inside_radius: boolean
  message: string
  distance: number | null
  radius: number | null
  location_id: number | null
  location_name: string | null
  latitude: number | null
  longitude: number | null
}

export const faceService = {
  verify: async (employeeId: number, descriptor: number[]) => {
    const { data } = await api.post<ApiResponse<VerifyResult>>('/faces/verify', {
      employee_id: employeeId,
      descriptor,
      threshold: 0.50,
    })
    return data.data
  },
  register: async (employeeId: number, descriptor: number[], image?: File) => {
    if (image) {
      const fd = new FormData()
      fd.append('employee_id', String(employeeId))
      fd.append('descriptor', JSON.stringify(descriptor))
      fd.append('force', '1')
      fd.append('image', image)
      const { data } = await api.post('/faces/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    }
    const { data } = await api.post('/faces/register', {
      employee_id: employeeId,
      descriptor,
      force: true,
    })
    return data.data
  },
  getHistory: async (employeeId?: number) => {
    const params = employeeId ? { employee_id: employeeId } : {}
    const { data } = await api.get('/faces/history', { params })
    return data.data
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/faces/${id}`)
    return data
  },
}

export const geolocationService = {
  validate: async (latitude: number, longitude: number, locationId?: number) => {
    const { data } = await api.post<ApiResponse<GeolocationResult>>('/geolocation/validate', {
      latitude,
      longitude,
      location_id: locationId,
    })
    return data.data
  },
}

export interface FaceUpdateRequest {
  id: number
  employee_id: number
  employee?: { id: number; name: string; nik: string }
  approver?: { id: number; name: string }
  descriptor_path: string
  image_path: string | null
  status: 'pending' | 'approved' | 'rejected'
  admin_note: string | null
  created_at: string
}

export const faceUpdateRequestService = {
  getAll: async (params?: { page?: number; per_page?: number; status?: string }) => {
    const { data } = await api.get('/face-update-requests', { params })
    return data
  },
  create: async (descriptor: number[], image?: File) => {
    if (image) {
      const fd = new FormData()
      fd.append('descriptor', JSON.stringify(descriptor))
      fd.append('image', image)
      const { data } = await api.post('/face-update-requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    }
    const { data } = await api.post('/face-update-requests', { descriptor: JSON.stringify(descriptor) })
    return data.data
  },
  approve: async (id: number) => {
    const { data } = await api.post(`/face-update-requests/${id}/approve`)
    return data.data
  },
  reject: async (id: number, adminNote: string) => {
    const { data } = await api.post(`/face-update-requests/${id}/reject`, { admin_note: adminNote })
    return data.data
  },
}
