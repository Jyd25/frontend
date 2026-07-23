import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  Users, CheckCircle2, Clock, XCircle, Briefcase, MapPin, AlertTriangle,
  CalendarCheck, FileText, HeartPulse, Loader2, Download, UserCog,
  Eye, History, Server, Wifi, Database, RefreshCw, ChevronRight,
  ScanFace, Stethoscope
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'
import { dashboardService } from '@/services/dashboard.service'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { Link } from 'react-router-dom'

const dayAbbrev: Record<string, string> = {
  'Senin': 'Sen', 'Selasa': 'Sel', 'Rabu': 'Rab', 'Kamis': 'Kam',
  'Jumat': 'Jum', 'Sabtu': 'Sab', 'Minggu': 'Min',
  'Monday': 'Sen', 'Tuesday': 'Sel', 'Wednesday': 'Rab', 'Thursday': 'Kam',
  'Friday': 'Jum', 'Saturday': 'Sab', 'Sunday': 'Min',
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3">
      <p className="text-xs font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-medium text-gray-800">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [now, setNow] = useState(new Date())
  const [chartTab, setChartTab] = useState<'weekly' | 'monthly'>('weekly')
  const isAdmin = ['Administrator', 'Pimpinan'].includes(user?.role?.name ?? '')
  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')
  const isPimpinan = user?.role?.name === 'Pimpinan'

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

  const { data: weeklyData } = useQuery({
    queryKey: ['dashboard-weekly'],
    queryFn: dashboardService.getWeekly,
    staleTime: 60000,
    enabled: isAdmin && chartTab === 'weekly',
  })

  const { data: monthlyData } = useQuery({
    queryKey: ['dashboard-monthly'],
    queryFn: dashboardService.getMonthly,
    staleTime: 60000,
    enabled: isAdmin && chartTab === 'monthly',
  })

  const clockDisplay = useMemo(() => {
    const hours = now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false })
    const minutes = now.toLocaleTimeString('id-ID', { minute: '2-digit' })
    const seconds = now.toLocaleTimeString('id-ID', { second: '2-digit' })
    return { hours, minutes, seconds }
  }, [now])

  const chartData = useMemo(() => {
    if (!weeklyData || !Array.isArray(weeklyData)) return []
    return weeklyData.map((d: any) => ({
      name: dayAbbrev[d.day] || d.day?.slice(0, 3) || '?',
      Hadir: d.present ?? 0,
      Terlambat: d.late ?? 0,
      Alpha: d.absent ?? 0,
    }))
  }, [weeklyData])

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

  const checkoutBadge = (status?: string) => {
    if (!status) return null
    switch (status) {
      case 'Pulang Tepat Waktu': return <Badge variant="success">Pulang Tepat Waktu</Badge>
      case 'Pulang Cepat': return <Badge variant="warning">Pulang Cepat</Badge>
      case 'Libur': return <Badge variant="info">Libur</Badge>
      default: return <Badge>{status}</Badge>
    }
  }

  const formatTime = (t?: string) => {
    if (!t) return '-'
    return new Date(t).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-6">
        <div className="gradient-primary rounded-2xl px-8 py-10 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    )
  }

  const mainStats = [
    { label: 'Total Karyawan', value: stats?.total_employees ?? 0, icon: Users, color: 'bg-sky-50 text-sky-600', ring: 'ring-sky-500/10' },
    { label: 'Hadir Hari Ini', value: stats?.today_present ?? 0, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-500/10' },
    { label: 'Terlambat', value: stats?.today_late ?? 0, icon: Clock, color: 'bg-amber-50 text-amber-600', ring: 'ring-amber-500/10' },
    { label: 'Alpha', value: stats?.today_absent ?? 0, icon: XCircle, color: 'bg-red-50 text-red-600', ring: 'ring-red-500/10' },
  ]

  const detailStats = [
    { label: 'Presensi Hari Ini', value: (stats?.today_present ?? 0) + (stats?.today_late ?? 0), icon: CalendarCheck, color: 'bg-indigo-50 text-indigo-600', ring: 'ring-indigo-500/10' },
    { label: 'Izin', value: stats?.today_permission ?? 0, icon: FileText, color: 'bg-teal-50 text-teal-600', ring: 'ring-teal-500/10' },
    { label: 'Sakit', value: stats?.today_sick ?? 0, icon: Stethoscope, color: 'bg-rose-50 text-rose-600', ring: 'ring-rose-500/10' },
  ]

  const adminActions = [
    { label: 'Kelola Karyawan', desc: 'Data & akun karyawan', icon: Users, href: '/employees', color: 'bg-sky-50 text-sky-600' },
    { label: 'Presensi', desc: 'Kehadiran harian', icon: CalendarCheck, href: '/attendances', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Laporan', desc: 'Export data kehadiran', icon: Download, href: '/export', color: 'bg-amber-50 text-amber-600' },
    { label: 'User', desc: 'Manajemen akun', icon: UserCog, href: '/users', color: 'bg-violet-50 text-violet-600' },
  ]

  const pimpinanActions = [
    { label: 'Monitoring', desc: 'Pantau kehadiran realtime', icon: Eye, href: '/attendance', color: 'bg-sky-50 text-sky-600' },
    { label: 'Riwayat', desc: 'Histori kehadiran', icon: History, href: '/history', color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Laporan', desc: 'Export data kehadiran', icon: Download, href: '/export', color: 'bg-amber-50 text-amber-600' },
  ]

  const quickActions = isPimpinan ? pimpinanActions : adminActions

  const systemInfo = [
    { label: 'API Server', icon: Server, status: stats ? 'online' : 'offline', color: stats ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' : 'bg-red-50 text-red-700 ring-red-600/10' },
    { label: 'WebSocket', icon: Wifi, status: 'online', color: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' },
    { label: 'Database', icon: Database, status: stats ? 'online' : 'offline', color: stats ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' : 'bg-red-50 text-red-700 ring-red-600/10' },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">

      {/* ============================================================
          SECTION 1 — WELCOME HEADER
          ============================================================ */}
      <div className="gradient-primary rounded-2xl px-6 sm:px-8 py-7 sm:py-8 shadow-lg shadow-sky-500/10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-white/70">{greeting},</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mt-0.5">{user?.name}</h1>
            <p className="text-sm text-white/55 mt-1">{user?.role?.name} &middot; Cahaya Rancamaya Islamic Boarding School</p>
            <p className="text-xs text-white/40 mt-2 max-w-md leading-relaxed hidden sm:block">
              Monitoring Sistem Kehadiran Real-time &mdash; Kelola dan pantau aktivitas kehadiran seluruh karyawan dalam satu platform.
            </p>
          </div>
          <div className="flex flex-col items-center lg:items-end">
            <div className="inline-flex items-baseline gap-0.5 font-mono tabular-nums tracking-tighter">
              <span className="text-4xl sm:text-5xl font-semibold text-white">{clockDisplay.hours}</span>
              <span className="text-xl sm:text-2xl font-light text-white/70 animate-pulse">:</span>
              <span className="text-4xl sm:text-5xl font-semibold text-white">{clockDisplay.minutes}</span>
              <span className="text-xl sm:text-2xl font-light text-white/40">:</span>
              <span className="text-4xl sm:text-5xl font-normal text-white/50">{clockDisplay.seconds}</span>
            </div>
            <p className="text-xs text-white/50 mt-1.5 capitalize">
              {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          SECTION 2 — STATISTICS
          ============================================================ */}
      {isAdmin && (
        <>
          {/* Main Stats — 4 cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {mainStats.map((s) => (
              <Card key={s.label} className="overflow-hidden">
                <CardContent className="!px-5 !pb-5 !pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-xl ring-1 ${s.ring} ${s.color}`}>
                      <s.icon size={18} />
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{s.label.split(' ')[0]}</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight text-gray-950 tabular-nums">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1 font-medium">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detail Stats — 3 cards */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {detailStats.map((s) => (
              <Card key={s.label} className="overflow-hidden">
                <CardContent className="!px-4 !pb-4 !pt-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ring-1 ${s.ring} ${s.color}`}>
                      <s.icon size={16} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold tracking-tight text-gray-950 tabular-nums">{s.value}</p>
                      <p className="text-[11px] text-gray-500 font-medium">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ============================================================
          SECTION 3 — ATTENDANCE CHART (Admin only)
          ============================================================ */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Grafik Kehadiran</CardTitle>
              <CardDescription>Statistik kehadiran 7 hari terakhir</CardDescription>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartTab('weekly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  chartTab === 'weekly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mingguan
              </button>
              <button
                onClick={() => setChartTab('monthly')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
                  chartTab === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Bulanan
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {chartTab === 'weekly' ? (
              chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: '#94a3b8' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    />
                    <Bar dataKey="Hadir" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Terlambat" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Alpha" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                  Belum ada data mingguan
                </div>
              )
            ) : (
              monthlyData ? (
                <div className="space-y-5 py-4">
                  <div className="text-center">
                    <p className="text-5xl font-bold gradient-text">{monthlyData.attendance_rate ?? 0}%</p>
                    <p className="text-sm text-gray-500 mt-1">Tingkat Kehadiran Bulan Ini</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {monthlyData.month}/{monthlyData.year} &middot; {monthlyData.days_in_month} hari &middot; {monthlyData.total_employees} karyawan
                    </p>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {[
                      { label: 'Hadir', value: monthlyData.present ?? 0, color: 'bg-emerald-50 text-emerald-700' },
                      { label: 'Terlambat', value: monthlyData.late ?? 0, color: 'bg-amber-50 text-amber-700' },
                      { label: 'Izin', value: monthlyData.permission ?? 0, color: 'bg-teal-50 text-teal-700' },
                      { label: 'Cuti', value: monthlyData.leave ?? 0, color: 'bg-sky-50 text-sky-700' },
                      { label: 'Sakit', value: monthlyData.sick ?? 0, color: 'bg-rose-50 text-rose-700' },
                      { label: 'Alpha', value: monthlyData.absent ?? 0, color: 'bg-red-50 text-red-700' },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-xl ${item.color} p-3 text-center`}>
                        <p className="text-xl font-bold tabular-nums">{item.value}</p>
                        <p className="text-[10px] font-medium uppercase tracking-wider mt-0.5 opacity-80">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-gray-400">
                  Memuat data bulanan...
                </div>
              )
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================
          SECTION 4 — ACTIVITY (Admin / Pimpinan)
          ============================================================ */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Hadir Hari Ini */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-50 ring-1 ring-emerald-500/10">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Kehadiran Hari Ini</CardTitle>
                  <CardDescription>{stats?.today_attendance_list?.length ?? 0} orang hadir</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 -mr-1">
                {(!stats?.today_attendance_list || stats.today_attendance_list.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-8">Belum ada yang hadir</p>
                )}
                {stats?.today_attendance_list?.map((att: any) => (
                  <div key={att.employee_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-100 to-teal-50 flex items-center justify-center text-sky-700 text-xs font-bold flex-shrink-0 ring-1 ring-sky-100">
                      {att.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{att.name}</p>
                      <p className="text-[11px] text-gray-400">{att.department}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {statusBadge(att.status)}
                      {checkoutBadge(att.status_checkout)}
                      {att.check_in_time && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(att.check_in_time)}</p>
                      )}
                      {att.late_minutes > 0 && (
                        <p className="text-[10px] text-amber-500 font-medium">+{att.late_minutes}m</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Belum Absen */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-50 ring-1 ring-red-500/10">
                  <XCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Belum Kehadiran</CardTitle>
                  <CardDescription>{stats?.today_absent_list?.length ?? 0} orang alpha</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1 -mr-1">
                {(!stats?.today_absent_list || stats.today_absent_list.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-8">Semua sudah hadir</p>
                )}
                {stats?.today_absent_list?.map((emp: any) => (
                  <div key={emp.employee_id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-red-50/40 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-500 text-xs font-bold flex-shrink-0 ring-1 ring-red-100">
                      {emp.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-gray-900 truncate">{emp.name}</p>
                      <p className="text-[11px] text-gray-400">{emp.department}</p>
                    </div>
                    <Badge variant="danger" className="text-[10px]">Alpha</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================
          SECTION 5 + 6 — QUICK ACTIONS + SYSTEM INFO
          ============================================================ */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Quick Action</CardTitle>
              <CardDescription>Akses cepat ke modul penting</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    to={action.href}
                    className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all duration-200 text-center"
                  >
                    <div className={`p-2.5 rounded-xl ${action.color} transition-transform duration-200 group-hover:scale-105`}>
                      <action.icon size={20} />
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-950 transition-colors">{action.label}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{action.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informasi Sistem</CardTitle>
              <CardDescription>Status layanan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {systemInfo.map((item) => (
                  <div key={item.label} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/80">
                    <div className="flex items-center gap-2.5">
                      <item.icon size={14} className="text-gray-400" />
                      <span className="text-[13px] font-medium text-gray-700">{item.label}</span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ring-1 ring-inset uppercase tracking-wider ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50/80">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={14} className="text-gray-400" />
                    <span className="text-[13px] font-medium text-gray-700">Sinkronisasi</span>
                  </div>
                  <span className="text-[11px] font-medium text-gray-500 tabular-nums">
                    {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="rounded-xl gradient-primary-subtle border border-sky-100 p-3.5">
                    <p className="text-xs font-semibold text-gray-800">Realtime Attendance System</p>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                      Sistem kehadiran dengan face recognition, validasi geolokasi, dan notifikasi real-time.
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-400 font-medium">v1.0.0</span>
                      <span className="text-[10px] text-gray-300">|</span>
                      <span className="text-[10px] text-gray-400 font-medium">WIB (UTC+7)</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============================================================
          GURU / KARYAWAN — OWN ATTENDANCE
          ============================================================ */}
      {isStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Kehadiran Hari Ini */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${
                  stats?.my_attendance?.status === 'present' ? 'bg-emerald-50 ring-1 ring-emerald-500/10' :
                  stats?.my_attendance?.status === 'late' ? 'bg-amber-50 ring-1 ring-amber-500/10' :
                  'bg-red-50 ring-1 ring-red-500/10'
                }`}>
                  {stats?.my_attendance?.status === 'present' || stats?.my_attendance?.status === 'late'
                    ? <CheckCircle2 size={14} className={
                        stats.my_attendance.status === 'present' ? 'text-emerald-600' : 'text-amber-600'
                      } />
                    : <XCircle size={14} className="text-red-600" />
                  }
                </div>
                <div>
                  <CardTitle className="text-sm">Status Kehadiran</CardTitle>
                  <CardDescription>Kehadiran hari ini</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stats?.my_attendance ? (
                <div className="space-y-4">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                    stats.my_attendance.status === 'present' ? 'bg-emerald-50 text-emerald-700' :
                    stats.my_attendance.status === 'late' ? 'bg-amber-50 text-amber-700' :
                    stats.my_attendance.status === 'permission' ? 'bg-teal-50 text-teal-700' :
                    stats.my_attendance.status === 'sick' ? 'bg-rose-50 text-rose-700' :
                    'bg-gray-50 text-gray-700'
                  }`}>
                    {stats.my_attendance.status === 'present' ? 'Hadir' :
                     stats.my_attendance.status === 'late' ? 'Terlambat' :
                     stats.my_attendance.status === 'permission' ? 'Izin' :
                     stats.my_attendance.status === 'leave' ? 'Cuti' :
                     stats.my_attendance.status === 'sick' ? 'Sakit' : stats.my_attendance.status}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-50/80 text-center ring-1 ring-emerald-100">
                      <p className="text-[10px] text-emerald-600 uppercase font-semibold tracking-wider">Check-In</p>
                      <p className="text-xl font-bold text-emerald-700 tabular-nums mt-1">{formatTime(stats.my_attendance.check_in_time)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-sky-50/80 text-center ring-1 ring-sky-100">
                      <p className="text-[10px] text-sky-600 uppercase font-semibold tracking-wider">Check-Out</p>
                      <p className="text-xl font-bold text-sky-700 tabular-nums mt-1">{formatTime(stats.my_attendance.check_out_time)}</p>
                    </div>
                  </div>
                  {stats.my_attendance.status_checkout && (
                    <div className="text-center">
                      {checkoutBadge(stats.my_attendance.status_checkout)}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {stats.my_attendance.location_status && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50">
                        <MapPin size={12} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">{stats.my_attendance.location_status}</span>
                      </div>
                    )}
                    {stats.my_attendance.face_status && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50">
                        <ScanFace size={12} className="text-gray-400" />
                        <span className="text-[11px] text-gray-500">{stats.my_attendance.face_status}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle size={32} className="mx-auto text-amber-400 mb-2" />
                  <p className="text-sm font-medium text-gray-700">Belum Kehadiran Hari Ini</p>
                  <p className="text-xs text-gray-500 mt-1">Silakan lakukan check-in di halaman kehadiran</p>
                  <Link to="/attendance" className="inline-block mt-3">
                    <span className="text-sm font-semibold text-sky-600 hover:text-sky-700 transition-colors">Absen Sekarang &rarr;</span>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Jadwal Kerja */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-50 ring-1 ring-sky-500/10">
                  <Briefcase size={14} className="text-sky-600" />
                </div>
                <div>
                  <CardTitle className="text-sm">Jadwal Kerja</CardTitle>
                  <CardDescription>Jadwal kehadiran Anda</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: Briefcase, label: 'Jam Kerja', value: stats?.schedule?.start_time && stats?.schedule?.end_time ? `${stats.schedule.start_time} — ${stats.schedule.end_time} WIB` : '07:00 — 16:00 WIB', color: 'bg-sky-50 text-sky-600' },
                  { icon: Clock, label: 'Batas Check-In', value: stats?.schedule?.presensi_start ? `${stats.schedule.presensi_start} WIB` : '07:00 WIB', color: 'bg-amber-50 text-amber-600' },
                  { icon: Clock, label: 'Batas Check-Out', value: stats?.schedule?.presensi_deadline ? `${stats.schedule.presensi_deadline} WIB` : '16:00 WIB', color: 'bg-amber-50 text-amber-600' },
                  { icon: MapPin, label: 'Lokasi', value: 'Jl. Rancamaya No.30, Bogor', color: 'bg-teal-50 text-teal-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/80 hover:bg-gray-50 transition-colors">
                    <div className={`p-1.5 rounded-lg ${item.color}`}>
                      <item.icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">{item.label}</p>
                      <p className="text-[13px] font-medium text-gray-800">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="rounded-xl gradient-primary-subtle border border-sky-100 p-3.5">
                  <p className="text-xs font-semibold text-gray-800">Cahaya Rancamaya Islamic Boarding School</p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    Sistem kehadiran dengan face recognition dan validasi geolokasi. Pastikan Anda berada di area sekolah saat check-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
