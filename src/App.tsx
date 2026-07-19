import { Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import AuthLayout from './components/layouts/AuthLayout'
import MainLayout from './components/layouts/MainLayout'
import { useAuthStore } from './stores/useAuthStore'

const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const EmployeeListPage = lazy(() => import('./pages/employees/EmployeeListPage'))
const EmployeeFormPage = lazy(() => import('./pages/employees/EmployeeFormPage'))
const DepartmentListPage = lazy(() => import('./pages/departments/DepartmentListPage'))
const PositionListPage = lazy(() => import('./pages/positions/PositionListPage'))
const ScheduleListPage = lazy(() => import('./pages/schedules/ScheduleListPage'))
const LocationListPage = lazy(() => import('./pages/locations/LocationListPage'))
const AttendancePage = lazy(() => import('./pages/attendance/AttendancePage'))
const AttendanceListPage = lazy(() => import('./pages/attendance/AttendanceListPage'))
const HistoryPage = lazy(() => import('./pages/history/HistoryPage'))
const NotificationPage = lazy(() => import('./pages/notifications/NotificationPage'))
const UserListPage = lazy(() => import('./pages/users/UserListPage'))
const LeavePage = lazy(() => import('./pages/leaves/LeavePage'))
const CorrectionPage = lazy(() => import('./pages/corrections/CorrectionPage'))
const ExportPage = lazy(() => import('./pages/reports/ExportPage'))

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  )
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />
  const defaultRoute = ['Administrator', 'Pimpinan'].includes(user.role?.name ?? '') ? '/dashboard' : '/attendance'
  return <Navigate to={defaultRoute} replace />
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeeListPage />} />
          <Route path="/employees/create" element={<EmployeeFormPage />} />
          <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
          <Route path="/departments" element={<DepartmentListPage />} />
          <Route path="/positions" element={<PositionListPage />} />
          <Route path="/schedules" element={<ScheduleListPage />} />
          <Route path="/locations" element={<LocationListPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendances" element={<AttendanceListPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/notifications" element={<NotificationPage />} />
          <Route path="/users" element={<UserListPage />} />
          <Route path="/leaves" element={<LeavePage />} />
          <Route path="/corrections" element={<CorrectionPage />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
