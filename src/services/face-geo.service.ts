import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'

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
    const fd = new FormData()
    fd.append('employee_id', String(employeeId))
    fd.append('descriptor', JSON.stringify(descriptor))
    if (image) fd.append('image', image)
    const { data } = await api.post('/faces/register', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
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
