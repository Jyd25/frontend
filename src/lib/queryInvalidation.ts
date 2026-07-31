import type { QueryClient } from '@tanstack/react-query'

export function invalidateAttendanceQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['attendance-today'] })
  qc.invalidateQueries({ queryKey: ['attendances-monthly'] })
  qc.invalidateQueries({ queryKey: ['attendances'] })
  qc.invalidateQueries({ queryKey: ['attendance-history'] })
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
  qc.invalidateQueries({ queryKey: ['dashboard-weekly'] })
  qc.invalidateQueries({ queryKey: ['dashboard-monthly'] })
  qc.invalidateQueries({ queryKey: ['notifications-unread'] })
}

export function invalidateFaceQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['face-history'] })
  qc.invalidateQueries({ queryKey: ['face-update-requests'] })
  qc.invalidateQueries({ queryKey: ['profile'] })
  qc.invalidateQueries({ queryKey: ['profile-full'] })
  qc.invalidateQueries({ queryKey: ['employees-all'] })
  qc.invalidateQueries({ queryKey: ['employee'] })
}

export function invalidateEmployeeQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['employees-all'] })
  qc.invalidateQueries({ queryKey: ['employees'] })
  qc.invalidateQueries({ queryKey: ['employee'] })
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
}

export function invalidateAdminQueries(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ['departments'] })
  qc.invalidateQueries({ queryKey: ['positions'] })
  qc.invalidateQueries({ queryKey: ['schedules'] })
  qc.invalidateQueries({ queryKey: ['locations'] })
  qc.invalidateQueries({ queryKey: ['users'] })
  qc.invalidateQueries({ queryKey: ['roles'] })
  qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
}
