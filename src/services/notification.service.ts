import api from '@/lib/axios'
import type { ApiResponse, PaginatedResponse, Notification } from '@/types/api'

export const notificationService = {
  getAll: async (params?: { page?: number; per_page?: number }) => {
    const { data } = await api.get<PaginatedResponse<Notification>>('/notifications', { params })
    return data
  },
  markAsRead: async (id: number) => {
    const { data } = await api.patch<ApiResponse<Notification>>(`/notifications/${id}/read`)
    return data.data
  },
  markAllAsRead: async () => {
    await api.post('/notifications/mark-all-read')
  },
}
