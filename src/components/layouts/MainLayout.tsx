import { Outlet, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useLogout, useProfile } from '@/hooks/useAuth'
import { LogOut, LayoutDashboard, Users, Building2, Briefcase, Clock, MapPin, CalendarCheck, Bell, Menu, X, UserCog, FileText, AlertTriangle, Download, Camera, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import Logo from '@/components/ui/Logo'
import Modal from '@/components/ui/Modal'
import api from '@/lib/axios'
import { attendanceService } from '@/services/attendance.service'

type SidebarItem = 
  | { divider: boolean; label: string; roles: string[] }
  | { label: string; icon: any; href: string; roles: string[] }

const sidebarItems: SidebarItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['Administrator', 'Pimpinan'] },
  { divider: true, label: ' MENU UTAMA', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Kehadiran', icon: CalendarCheck, href: '/attendance', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Izin / Sakit / Cuti', icon: FileText, href: '/leaves', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Perbaikan Kehadiran', icon: AlertTriangle, href: '/corrections', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Update Wajah', icon: Camera, href: '/face-update-requests', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { divider: true, label: ' MANAJEMEN', roles: ['Administrator'] },
  { label: 'Export Laporan', icon: Download, href: '/export', roles: ['Administrator', 'Pimpinan'] },
  { label: 'Karyawan', icon: Users, href: '/employees', roles: ['Administrator'] },
  { label: 'Departemen', icon: Building2, href: '/departments', roles: ['Administrator'] },
  { label: 'Jabatan', icon: Briefcase, href: '/positions', roles: ['Administrator'] },
  { label: 'Jadwal', icon: Clock, href: '/schedules', roles: ['Administrator'] },
  { label: 'Lokasi', icon: MapPin, href: '/locations', roles: ['Administrator'] },
  { divider: true, label: ' LAINNYA', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Riwayat', icon: CalendarCheck, href: '/history', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Notifikasi', icon: Bell, href: '/notifications', roles: ['Administrator', 'Pimpinan', 'Guru', 'Karyawan'] },
  { label: 'Manajemen User', icon: UserCog, href: '/users', roles: ['Administrator'] },
]

export default function MainLayout() {
  const { user, isAuthenticated, setUser } = useAuthStore()
  const logout = useLogout()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showAbsenPopup, setShowAbsenPopup] = useState(false)
  const { data: profileData } = useProfile()

  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const { data } = await api.get('/notifications/unread-count')
      return data.data
    },
    refetchInterval: 30000,
    staleTime: 30000,
  })

  const { data: todayAttendance } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: attendanceService.getToday,
    staleTime: 60000,
  })

  useEffect(() => {
    if (profileData && !user) {
      setUser(profileData)
    }
  }, [profileData, user, setUser])

  useEffect(() => {
    if (todayAttendance === null && !sessionStorage.getItem('absen_popup_shown')) {
      const timer = setTimeout(() => {
        setShowAbsenPopup(true)
        sessionStorage.setItem('absen_popup_shown', '1')
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [todayAttendance])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-sky-200 border-t-teal-600 rounded-full" /></div>

  const filteredItems = sidebarItems.filter((item) => item.roles.includes(user.role?.name))

  const handleLogout = () => {
    logout.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-50/80">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200/80 transition-transform duration-200 lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="text-[15px] font-semibold text-gray-900 tracking-tight">Sistem Kehadiran</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-0.5 overflow-y-auto max-h-[calc(100vh-5rem)]">
          {filteredItems.map((item, i) => {
            if ('divider' in item && item.divider) {
              return (
                <div key={`div-${i}`} className="pt-4 pb-1.5 px-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{item.label}</p>
                </div>
              )
            }
            const navItem = item as typeof sidebarItems[number] & { icon: any; href: string }
            const isActive = location.pathname.startsWith(navItem.href)
            return (
              <Link key={navItem.href} to={navItem.href} onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150",
                  isActive
                    ? "gradient-primary text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}>
                <navItem.icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                {navItem.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-100 bg-white">
          <Link to="/profile" className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left" onClick={() => setSidebarOpen(false)}>
            {user.employee?.photo ? (
              <img src={user.employee.photo} alt={user.name}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                {user.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-[11px] text-gray-500">{user.role?.name}</p>
            </div>
          </Link>
        </div>
      </aside>

      {/* Absen Warning Popup */}
      <Modal open={showAbsenPopup} onClose={() => setShowAbsenPopup(false)} title="Peringatan Kehadiran">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-amber-500" />
          </div>
          <p className="text-sm font-medium text-gray-800 mb-1">Anda belum melakukan presensi</p>
          <p className="text-xs text-gray-500 mb-5">Silakan lakukan check-in sekarang untuk mencatat kehadiran hari ini.</p>
          <button
            onClick={() => { setShowAbsenPopup(false); navigate('/attendance') }}
            className="w-full py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:opacity-90 transition-opacity"
          >
            Presen Sekarang
          </button>
        </div>
      </Modal>

      {/* Main content */}
      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 h-14 sm:h-16 bg-white/80 backdrop-blur-xl border-b border-gray-200/80 flex items-center justify-between px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <div className="flex items-center gap-2 sm:hidden">
              <Link to="/profile" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                {user.employee?.photo ? (
                  <img src={user.employee.photo} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-[10px]">
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                <span className="text-[11px] font-medium text-gray-600 max-w-[80px] truncate">{user.role?.name}</span>
              </Link>
            </div>
            <Link to="/notifications" className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={18} />
              {unreadData?.count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold">
                  {unreadData.count > 99 ? '99+' : unreadData.count}
                </span>
              )}
            </Link>
            <div className="hidden sm:flex items-center gap-3">
              <Link to="/profile" className="text-right cursor-pointer">
                <p className="text-[13px] font-medium text-gray-900">{user.name}</p>
                <p className="text-[11px] text-gray-500">{user.role?.name}</p>
              </Link>
            </div>
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
