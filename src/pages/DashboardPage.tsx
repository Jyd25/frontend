import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/useAuthStore'
import { Users, CheckCircle2, Clock, XCircle, Briefcase, MapPin, AlertTriangle } from 'lucide-react'
import { dashboardService } from '@/services/dashboard.service'
import Card from '@/components/ui/Card'

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const [now, setNow] = useState(new Date())

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

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardService.getStats,
  })

  const hours = now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false })
  const minutes = now.toLocaleTimeString('id-ID', { minute: '2-digit' })
  const seconds = now.toLocaleTimeString('id-ID', { second: '2-digit' })

  const statCards = [
    { label: 'Total Karyawan', value: stats?.total_employees ?? 0, icon: Users, accent: 'bg-sky-50 text-sky-600 ring-sky-500/10' },
    { label: 'Hadir Hari Ini', value: stats?.today_present ?? 0, icon: CheckCircle2, accent: 'bg-emerald-50 text-emerald-600 ring-emerald-500/10' },
    { label: 'Terlambat', value: stats?.today_late ?? 0, icon: Clock, accent: 'bg-amber-50 text-amber-600 ring-amber-500/10' },
    { label: 'Tidak Hadir', value: stats?.today_absent ?? 0, icon: XCircle, accent: 'bg-red-50 text-red-600 ring-red-500/10' },
  ]

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
            <span className="text-5xl sm:text-6xl font-semibold text-white">{hours}</span>
            <span className="text-2xl font-light text-white/70 animate-pulse">:</span>
            <span className="text-5xl sm:text-6xl font-semibold text-white">{minutes}</span>
            <span className="text-2xl font-light text-white/40">:</span>
            <span className="text-5xl sm:text-6xl font-normal text-white/50">{seconds}</span>
          </div>
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

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Jadwal Kerja">
          <div className="space-y-0 divide-y divide-gray-100">
            {[
              { icon: Briefcase, label: 'Jam Kerja', value: '07:00 — 16:00 WIB' },
              { icon: AlertTriangle, label: 'Batas Check-In', value: '09:00 WIB' },
              { icon: AlertTriangle, label: 'Batas Check-Out', value: '20:00 WIB' },
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
      </div>
    </div>
  )
}
