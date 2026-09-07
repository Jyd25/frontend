import api from '@/lib/axios'
import type { ApiResponse } from '@/types/api'

export type EmailSendStatus = 'not_sent' | 'pending' | 'sent' | 'failed'

export interface EmailReportItem {
  user_id: number
  employee_id: number | null
  name: string
  email: string
  nik: string
  records_count: number
  has_attendance: boolean
  report_id?: number | null
  report_created_at?: string | null
  format?: 'pdf' | 'excel'
  status: EmailSendStatus
  sent_at?: string | null
  error_message?: string | null
}

export interface EmailReportStatusData {
  period: string
  items: EmailReportItem[]
}

export const emailReportService = {
  getStatus: async (params: { start_date: string; end_date: string; department_id?: number }) => {
    const { data } = await api.get<ApiResponse<EmailReportStatusData>>('/export/emails/status', { params })
    return data.data
  },
  sendAll: async (payload: { start_date: string; end_date: string; department_id?: number; format: 'pdf' | 'excel' }) => {
    const { data } = await api.post<ApiResponse<{ queued_count: number; period: string; format: string }>>(
      '/export/emails/send',
      payload,
    )
    return data
  },
  resend: async (id: number) => {
    const { data } = await api.post<ApiResponse<{ report_id: number }>>(`/export/emails/${id}/resend`)
    return data
  },
}