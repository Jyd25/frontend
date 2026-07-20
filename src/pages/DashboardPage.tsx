import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { Users, CheckCircle2, Clock, XCircle, Briefcase, MapPin, AlertTriangle, CalendarCheck, UserCheck, UserX, Loader2 } from 'lucide-react'
import { dashboardService } from '@/services/dashboard.service'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Link } from 'react-router-dom'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [now, setNow] = useState(new Date())
  const isAdmin = ['Administrator', 'Pimpinan'].includes(user?.role?.name ?? '')
  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const greeting = (() => {
    const h = now.getHours()
    if (h < 11) return 'Selamat Pagi'
    if (h < 15) return 'Selamat Siang'
    if (h < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  })()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
    staleTime: 15000,
    refetchInterval: 30000,
  })

  const clockDisplay = useMemo(() => {
    const hours = now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false })
    const minutes = now.toLocaleTimeString('id-ID', { minute: '2-digit' })
    const seconds = now.toLocaleTimeString('id-ID', { second: '2-digit' })
    return { hours, minutes, seconds }
  }, [now])

  const statCards = [
    { label: 'Total Karyawan', value: stats?.total_employees ?? 0, icon: Users, accent: 'bg-sky-50 text-sky-600 ring-sky-500/10' },
    { label: 'Hadir Hari Ini', value: stats?.today_present ?? 0, icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-600 ring-emerald-500/10' },
    { label: 'Terlambat', value: stats?.today_late ?? 0, icon: Clock, accent: 'bg-amber-50 text-amber-600 ring-amber-500/10' },
    { label: 'Tidak Hadir', value: stats?.today_absent ?? 0, icon: XCircle, accent: 'bg-red-50 text-red-600 ring-red-500/10' },
  ]

  const statusBadge = (status: string) => {
    switch (status) {
      case 'present': return <Badge variant="success">Hadir</Badge>
      case 'late': return <Badge variant="warning">Terlambat</Badge>
      case 'absent': return <Badge variant="danger">Alpha</Badge>
      case 'permission': return <Badge variant="info">Izin</Badge>
      case 'leave': return <Badge variant="info">Cuti</Badge>
      case 'sick': return <Badge variant="warning">Sakit</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const formatTime = (t?: string) => {
    if (!t) return '-'
    return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="gradient-primary rounded-2xl px-8 py-8 text-center shadow-lg shadow-sky-500/15">
        <p className="text-sm text-white/70">{greeting}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white mt-0.5">{user?.name}</h1>
        <p className="text-sm text-white/60 mt-1">{user?.role?.name} &middot; Cahaya Rancamaya Islamic Boarding School</p>

        {/* Clock */}
        <div className="mt-5">
          <div className="inline-flex items-baseline gap-1 font-mono tabular-nums tracking-tighter">
            <span className="text-5xl sm:text-6xl font-semibold text-white">{clockDisplay.hours}</span>
            <span className="text-2xl font-light text-white/70 animate-pulse">:</span>
            <span className="text-5xl sm:text-6xl font-semibold text-white">{clockDisplay.minutes}</span>
            <span className="text-2xl font-light text-white/40">:</span>
            <span className="text-5xl sm:text-6xl font-normal text-white/50">{clockDisplay.seconds}</span>
          </div>
          {isStaff && stats?.current_date && (
            <p className="text-sm text-white/60 mt-2">
              {stats.day_name}, {new Date(stats.current_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          )}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] font-medium text-white/80 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="group relative rounded-xl border border-gray-200 bg-white p-5 transition-all hover:shadow-sm hover:border-gray-300 text-center">
            <div className="flex items-center justify-center mb-3">
              <div className={`p-1.5 rounded-lg ring-1 ${s.accent}`}>
                <s.icon size={15} />
              </div>
            </div>
            <p className="text-3xl font-semibold tracking-tight text-gray-950 tabular-nums">{s.value}</p>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mt-1.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ===== ADMIN / PIMPINAN: Attendance Detail List ===== */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Hadir Hari Ini */}
          <Card title="Karyawan Hadir Hari Ini">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stats?.today_attendance_list?.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada yang hadir</p>
              )}
              {stats?.today_attendance_list?.map((att: any) => (
                <div key={att.employee_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0">
                    {att.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{att.name}</p>
                    <p className="text-[11px] text-gray-500">{att.department}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {statusBadge(att.status)}
                    {att.check_in_time && (
                      <p className="text-[10px] text-gray-400 mt-0.5">Masuk {formatTime(att.check_in_time)}</p>
                    )}
                    {att.late_minutes > 0 && (
                      <p className="text-[10px] text-amber-500">+{att.late_minutes} menit</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Belum Absen */}
          <Card title="Belum Absen Hari Ini">
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {stats?.today_absent_list?.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Semua sudah hadir</p>
              )}
              {stats?.today_absent_list?.map((emp: any) => (
                <div key={emp.employee_id} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold flex-shrink-0">
                    {emp.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{emp.name}</p>
                    <p className="text-[11px] text-gray-500">{emp.department}</p>
                  </div>
                  <Badge variant="danger" className="text-[10px]">Alpha</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ===== GURU / KARYAWAN: Own Attendance ===== */}
      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Absensi Hari Ini */}
          <Card title="Status Absensi Hari Ini">
            {stats?.my_attendance ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    stats.my_attendance.status === 'present' ? 'bg-emerald-100 text-emerald-600' :
                    stats.my_attendance.status === 'late' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {stats.my_attendance.status === 'present' || stats.my_attendance.status === 'late'
                      ? <CheckCircle2 size={24} />
                      : <XCircle size={24} />
                    }
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {stats.my_attendance.status === 'present' ? 'Hadir' :
                       stats.my_attendance.status === 'late' ? 'Terlambat' :
                       stats.my_attendance.status === 'permission' ? 'Izin' :
                       stats.my_attendance.status === 'leave' ? 'Cuti' :
                       stats.my_attendance.status === 'sick' ? 'Sakit' : stats.my_attendance.status}
                    </p>
                    <p className="text-sm text-gray-500">Status kehadiran hari ini</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-50 text-center">
                    <p className="text-[10px] text-emerald-600 uppercase font-medium">Check-In</p>
                    <p className="text-lg font-bold text-emerald-700">{formatTime(stats.my_attendance.check_in_time)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-50 text-center">
                    <p className="text-[10px] text-sky-600 uppercase font-medium">Check-Out</p>
                    <p className="text-lg font-bold text-sky-700">{formatTime(stats.my_attendance.check_out_time)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle size={36} className="mx-auto text-amber-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Belum Absen Hari Ini</p>
                <p className="text-xs text-gray-500 mt-1">Silakan lakukan check-in di halaman absensi</p>
                <Link to="/attendance" className="inline-block mt-3">
                  <span className="text-sm font-medium text-sky-600 hover:text-sky-700">Absen Sekarang &rarr;</span>
                </Link>
              </div>
            )}
          </Card>

          {/* Jadwal */}
          <Card title="Jadwal Kerja">
            <div className="space-y-0 divide-y divide-gray-100">
              {[
                { icon: Briefcase, label: 'Jam Kerja', value: stats?.schedule?.start_time && stats?.schedule?.end_time ? `${stats.schedule.start_time} — ${stats.schedule.end_time} WIB` : '07:00 — 16:00 WIB' },
                { icon: AlertTriangle, label: 'Batas Check-In', value: stats?.schedule?.check_in_deadline ? `${stats.schedule.check_in_deadline} WIB` : '09:00 WIB' },
                { icon: AlertTriangle, label: 'Batas Check-Out', value: stats?.schedule?.check_out_deadline ? `${stats.schedule.check_out_deadline} WIB` : '20:00 WIB' },
                { icon: MapPin, label: 'Lokasi', value: 'Jl. Rancamaya No.30, Bogor Selatan' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="p-1.5 rounded-md bg-sky-50">
                    <item.icon size={14} className="text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-700">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {isAdmin && (
          <Card title="Tentang Sistem">
            <div className="space-y-4">
              <div className="rounded-xl gradient-primary-subtle border border-sky-100 p-4">
                <p className="text-sm font-medium text-gray-800">Realtime Attendance System</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Sistem absensi dengan face recognition, validasi geolokasi, dan notifikasi real-time untuk manajemen kehadiran sekolah.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Versi</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">1.0.0</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Zona Waktu</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">WIB (UTC+7)</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {isStaff && (
          <Card title="Informasi Absensi">
            <div className="space-y-4">
              <div className="rounded-xl gradient-primary-subtle border border-sky-100 p-4">
                <p className="text-sm font-medium text-gray-800">Cahaya Rancamaya Islamic Boarding School</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Sistem absensi dengan face recognition dan validasi geolokasi. Pastikan Anda berada di area sekolah saat melakukan check-in.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Jadwal</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">Senin-Sabtu</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Zona Waktu</p>
                  <p className="text-sm font-semibold text-gray-700 mt-0.5">WIB (UTC+7)</p>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
