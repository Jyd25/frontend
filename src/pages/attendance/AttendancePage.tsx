import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, MapPin, Camera, ChevronLeft, ChevronRight, AlertTriangle, Send, X, Pencil, Save, CalendarDays, Coffee, CalendarOff } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { correctionService } from '@/services/leave-correction.service'
import { holidayService } from '@/services/holiday.service'
import { invalidateAttendanceQueries } from '@/lib/queryInvalidation'
import { useAuthStore } from '@/stores/useAuthStore'
import PresensiModal from '@/components/attendance/PresensiModal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { formatTime } from '@/lib/utils'
import FaceThumbnail from '@/components/ui/FaceThumbnail'
import type { Attendance } from '@/types/api'

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function getTodaySchedule(schedule?: { start_time?: string; end_time?: string; saturday_start_time?: string; saturday_end_time?: string; working_days?: string[] }) {
  const now = new Date()
  const isSaturday = now.getDay() === 6
  const dayKey = DAY_KEYS[now.getDay()]
  const isWorkingDay = schedule?.working_days ? schedule.working_days.includes(dayKey) : true
  let startTime: string | undefined
  let endTime: string | undefined
  if (isSaturday && schedule?.saturday_start_time) {
    startTime = schedule.saturday_start_time
    endTime = schedule.saturday_end_time
  } else {
    startTime = schedule?.start_time
    endTime = schedule?.end_time
  }
  return { isWorkingDay, isSaturday, startTime, endTime }
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'Hadir': return <Badge variant="success">Hadir</Badge>
    case 'Terlambat': return <Badge variant="warning">Terlambat</Badge>
    case 'Alpha': return <Badge variant="danger">Alpha</Badge>
    case 'Izin': return <Badge variant="info">Izin</Badge>
    case 'Sakit': return <Badge variant="warning">Sakit</Badge>
    case 'Libur': return <Badge variant="info">Libur</Badge>
    default: return <Badge>{status || '-'}</Badge>
  }
}

function getCheckoutBadge(status?: string) {
  if (!status) return null
  switch (status) {
    case 'Pulang Tepat Waktu': return <Badge variant="success">Pulang Tepat Waktu</Badge>
    case 'Pulang Cepat': return <Badge variant="warning">Pulang Cepat</Badge>
    case 'Libur': return <Badge variant="info">Libur</Badge>
    default: return <Badge>{status}</Badge>
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case 'Hadir': case 'Present': return 'bg-green-500'
    case 'Terlambat': case 'Late': return 'bg-amber-500'
    case 'Izin': case 'Permission': return 'bg-blue-500'
    case 'Sakit': case 'Leave': return 'bg-amber-400'
    default: return 'bg-red-500'
  }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  const [realTime, setRealTime] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setRealTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const [showPresensiModal, setShowPresensiModal] = useState(false)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [correctionDate, setCorrectionDate] = useState('')
  const [correctionType, setCorrectionType] = useState<'check_in' | 'check_out'>('check_in')
  const [correctionReason, setCorrectionReason] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [editItem, setEditItem] = useState<Attendance | null>(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')

  const { data: todayAttendance, isLoading: todayLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: attendanceService.getToday,
    staleTime: 15000,
  })

  const { data: monthData, isLoading: monthLoading } = useQuery({
    queryKey: ['attendances-monthly', selectedMonth, selectedYear],
    queryFn: () =>
      attendanceService.getAll({
        month: selectedMonth,
        year: selectedYear,
        per_page: 100,
      }),
    staleTime: 10000,
  })

  const { data: holidayToday } = useQuery({
    queryKey: ['holiday-today'],
    queryFn: holidayService.getToday,
    staleTime: 3600000,
  })

  const { data: monthHolidays } = useQuery({
    queryKey: ['holidays-month', selectedMonth, selectedYear],
    queryFn: () => holidayService.getAll({ month: selectedMonth, year: selectedYear }),
    staleTime: 60000,
  })

  const isTodayHoliday = !!holidayToday?.is_non_working_day

  const holidayMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const h of monthHolidays || []) {
      if (h.date) map[h.date] = h.name
    }
    return map
  }, [monthHolidays])

  const createCorrection = useMutation({
    mutationFn: correctionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] })
      invalidateAttendanceQueries(queryClient)
      toast.success('Pengajuan perbaikan berhasil dikirim')
      setShowCorrectionModal(false)
      setCorrectionDate('')
      setCorrectionReason('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengajukan perbaikan'),
  })

  const updateAttendance = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { check_in_time?: string | null; check_out_time?: string | null } }) =>
      attendanceService.update(id, payload),
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient)
      toast.success('Data kehadiran berhasil diperbarui')
      setShowEditModal(false)
      setEditItem(null)
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui data'),
  })

  const isAdmin = user?.role?.name === 'Administrator'

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay()

  const attendanceMap = useMemo(() => {
    const map: Record<string, Attendance> = {}
    const items = monthData?.data?.items || []
    if (!isStaff) return map
    for (const item of items) {
      if (item.employee?.id !== user?.employee_id) continue
      let dateKey: string | null = null
      if (item.check_in_time) {
        dateKey = new Date(item.check_in_time).toLocaleDateString('sv-SE')
      } else if (item.check_out_time) {
        dateKey = new Date(item.check_out_time).toLocaleDateString('sv-SE')
      }
      if (dateKey) {
        if (!map[dateKey]) {
          map[dateKey] = item
        } else {
          if (item.check_in_time && !map[dateKey].check_in_time) map[dateKey] = item
        }
      }
    }
    return map
  }, [monthData, user, isStaff])

  const dayAttendanceMap = useMemo(() => {
    const map: Record<string, Attendance[]> = {}
    const items = monthData?.data?.items || []
    for (const item of items) {
      let dateKey: string | null = null
      if (item.check_in_time) {
        dateKey = new Date(item.check_in_time).toLocaleDateString('sv-SE')
      } else if (item.check_out_time) {
        dateKey = new Date(item.check_out_time).toLocaleDateString('sv-SE')
      }
      if (dateKey) {
        if (!map[dateKey]) map[dateKey] = []
        map[dateKey].push(item)
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.employee?.name || '').localeCompare(b.employee?.name || ''))
    }
    return map
  }, [monthData])

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)



  function formatDateKey(day: number) {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function dayOffName(day: number): string | null {
    const byHoliday = holidayMap[formatDateKey(day)]
    if (byHoliday) return byHoliday
    if (new Date(selectedYear, selectedMonth - 1, day).getDay() === 0) return 'Hari Minggu'
    return null
  }

  function openCorrection(day: number, type: 'check_in' | 'check_out') {
    setCorrectionDate(formatDateKey(day))
    setCorrectionType(type)
    setCorrectionReason('')
    setShowCorrectionModal(true)
  }

  function openEdit(item: Attendance) {
    setEditItem(item)
    setEditCheckIn(item.check_in_time ? new Date(item.check_in_time).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T') : '')
    setEditCheckOut(item.check_out_time ? new Date(item.check_out_time).toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' ', 'T') : '')
    setShowEditModal(true)
  }

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedMonth(12); setSelectedYear((y) => y - 1) }
    else setSelectedMonth((m) => m - 1)
  }

  function nextMonth() {
    if (selectedMonth === 12) { setSelectedMonth(1); setSelectedYear((y) => y + 1) }
    else setSelectedMonth((m) => m + 1)
  }

  const isCurrentMonth = selectedMonth === today.getMonth() + 1 && selectedYear === today.getFullYear()
  const isToday = (day: number) => isCurrentMonth && day === today.getDate()
  const isPast = (day: number) => {
    if (selectedYear < today.getFullYear()) return true
    if (selectedYear === today.getFullYear() && selectedMonth < today.getMonth() + 1) return true
    if (selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1 && day < today.getDate()) return true
    return false
  }

  const employeeMap = useMemo(() => {
    const map: Record<number, any> = {}
    const items = monthData?.data?.items || []
    for (const item of items) {
      if (item.employee?.id && !map[item.employee.id]) {
        map[item.employee.id] = item.employee
      }
    }
    return map
  }, [monthData])

  const schedule = user?.employee?.schedule
  const todaySchedule = getTodaySchedule(schedule)

  if (todayLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-200 border-t-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Kehadiran</h1>
          <p className="text-sm text-gray-500 mt-1">Data kehadiran bulanan</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200/80 px-4 py-2.5 shadow-sm">
            <Clock size={16} className="text-sky-500" />
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900 font-mono tracking-wider">
                {realTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-gray-400 -mt-0.5">
                {realTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowPresensiModal(true)} disabled={isTodayHoliday} title={isTodayHoliday ? `Hari libur (${holidayToday?.name}) — presensi tidak diperlukan` : undefined}>
            <Camera size={16} className="mr-2" /> {isTodayHoliday ? 'Hari Libur' : 'Presensi Sekarang'}
          </Button>
        </div>
      </div>

      {/* Jadwal Hari Ini */}
      <Card>
        {schedule ? (
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className={`p-2.5 rounded-xl ring-1 ${todaySchedule.isWorkingDay ? 'bg-sky-50 ring-sky-500/10' : 'bg-gray-100 ring-gray-200'}`}>
                <CalendarDays size={18} className={todaySchedule.isWorkingDay ? 'text-sky-600' : 'text-gray-400'} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-medium tracking-wider">Jadwal Hari Ini</p>
                <p className="text-sm font-semibold text-gray-900">{schedule.name}</p>
              </div>
              {todaySchedule.isWorkingDay ? (
                <Badge variant="success">Hari Kerja</Badge>
              ) : (
                <Badge>Hari Libur</Badge>
              )}
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/80">
                <Clock size={14} className="text-sky-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 uppercase font-medium tracking-wider">{todaySchedule.isSaturday && schedule.saturday_start_time ? 'Jam Kerja Sabtu' : 'Jam Masuk'}</p>
                  <p className="text-[13px] font-semibold text-gray-800 font-mono">{todaySchedule.startTime || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/80">
                <Clock size={14} className="text-orange-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 uppercase font-medium tracking-wider">Jam Pulang</p>
                  <p className="text-[13px] font-semibold text-gray-800 font-mono">{todaySchedule.endTime || '-'}</p>
                </div>
              </div>
              {(schedule.break_start && schedule.break_end) && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50/80 col-span-2 sm:col-span-1">
                  <Coffee size={14} className="text-purple-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 uppercase font-medium tracking-wider">Istirahat</p>
                    <p className="text-[13px] font-semibold text-gray-800 font-mono">{schedule.break_start} — {schedule.break_end}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-start sm:items-center lg:items-start xl:items-center gap-2 lg:gap-3 flex-shrink-0">
              {schedule.tolerance_minutes ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-md">
                  <AlertTriangle size={11} /> Toleransi {schedule.tolerance_minutes} menit
                </span>
              ) : null}
              <div className="flex gap-1">
                {DAY_NAMES.map((day, i) => {
                  const active = schedule.working_days?.includes(DAY_KEYS[i])
                  return (
                    <span key={day} className={`text-[10px] font-semibold w-7 text-center py-1 rounded-md ${active ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
                      {day}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gray-100 ring-1 ring-gray-200">
              <CalendarDays size={18} className="text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Belum ada jadwal kerja terdaftar</p>
              <p className="text-xs text-gray-400 mt-0.5">Hubungi administrator untuk pengaturan jadwal jam kerja Anda</p>
            </div>
          </div>
        )}
      </Card>

      {/* Banner Hari Libur */}
      {isTodayHoliday && (
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-50 ring-1 ring-teal-500/10">
              <CalendarOff size={18} className="text-teal-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">Hari Ini Libur — {holidayToday?.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Presensi check-in dan check-out tidak diperlukan. Status kehadiran hari ini otomatis terisi <span className="font-medium text-teal-600">Libur</span>.
              </p>
            </div>
            <Badge variant="info">Libur</Badge>
          </div>
        </Card>
      )}

      {/* Month Navigation */}
      <Card>
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">{MONTH_NAMES[selectedMonth]} {selectedYear}</h2>
            {isCurrentMonth && <p className="text-xs text-gray-400">{today.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          </div>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <div className="grid grid-cols-7 gap-px bg-gray-200/60 rounded-xl overflow-hidden">
          {DAY_NAMES.map((d) => (
            <div key={d} className="bg-gray-50 py-2 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} className="bg-white min-h-[100px] sm:min-h-[120px]" />
            const dateKey = formatDateKey(day)
            const attendance = isStaff ? attendanceMap[dateKey] : undefined
            const dayGroup = !isStaff ? dayAttendanceMap[dateKey] : undefined
            const hasData = isStaff ? !!attendance : !!dayGroup && dayGroup.length > 0
            const todayMark = isToday(day)
            const offName = dayOffName(day)
            const isLiburCell = attendance?.attendance_status === 'Libur'

            return (
              <div key={day} className={`bg-white min-h-[100px] sm:min-h-[120px] p-2 flex flex-col ${todayMark ? 'ring-2 ring-inset ring-sky-400/40' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${todayMark ? 'text-sky-600' : isPast(day) && !hasData ? 'text-gray-300' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  <div className="flex items-center gap-1">
                    {todayMark && <span className="text-[9px] font-bold text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-full">HARI INI</span>}
                    {attendance && (
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                        backgroundColor: attendance.attendance_status === 'Hadir' || attendance.attendance_status === 'Present' ? '#22c55e'
                          : attendance.attendance_status === 'Terlambat' || attendance.attendance_status === 'Late' ? '#f59e0b'
                          : attendance.attendance_status === 'Izin' || attendance.attendance_status === 'Permission' ? '#3b82f6'
                          : attendance.attendance_status === 'Sakit' || attendance.attendance_status === 'Leave' ? '#f59e0b'
                          : attendance.attendance_status === 'Libur' ? '#14b8a6'
                          : '#ef4444'
                      }} />
                    )}
                    {dayGroup && dayGroup.length > 0 && (
                      <span className="text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded-full">{dayGroup.length} org</span>
                    )}
                  </div>
                </div>

                {isStaff ? (
                  isLiburCell || (offName && !attendance) ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center gap-0.5 px-1">
                      <span className="text-[10px] font-semibold text-teal-500">Libur</span>
                      {offName && <span className="text-[8px] text-teal-400 leading-tight line-clamp-2">{offName}</span>}
                    </div>
                  ) : attendance ? (
                    <div className="flex-1 space-y-1">
                      {/* Face photo thumbnails */}
                      <div className="flex items-center gap-1">
                        {(attendance.checkin_photo_data || attendance.photo_data) && (
                          <div className={`w-6 h-6 rounded-md overflow-hidden border flex-shrink-0 ${
                            attendance.face_status === 'Matched' || attendance.face_status === 'matched' ? 'border-emerald-400' : 'border-amber-400'
                          }`}>
                            <img src={attendance.checkin_photo_data || attendance.photo_data} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {attendance.checkout_photo_data && (
                          <div className="w-6 h-6 rounded-md overflow-hidden border border-orange-400 flex-shrink-0">
                            <img src={attendance.checkout_photo_data} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>

                      {/* Times */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Clock size={9} className="text-sky-500 flex-shrink-0" />
                          <span className={`text-[10px] ${attendance.check_in_time ? 'text-gray-700 font-medium' : 'text-amber-500'}`}>
                            {attendance.check_in_time ? formatTime(attendance.check_in_time) : '—'}
                          </span>
                          {!attendance.check_in_time && isStaff && isPast(day) && (
                            <button onClick={() => openCorrection(day, 'check_in')} className="text-[9px] text-sky-500 hover:text-sky-700 font-medium flex items-center gap-0.5 ml-auto" title="Ajukan perbaikan">
                              <Send size={7} />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={9} className="text-orange-500 flex-shrink-0" />
                          <span className={`text-[10px] ${attendance.check_out_time ? 'text-gray-700 font-medium' : 'text-amber-500'}`}>
                            {attendance.check_out_time ? formatTime(attendance.check_out_time) : '—'}
                          </span>
                          {!attendance.check_out_time && isStaff && isPast(day) && (
                            <button onClick={() => openCorrection(day, 'check_out')} className="text-[9px] text-sky-500 hover:text-sky-700 font-medium flex items-center gap-0.5 ml-auto" title="Ajukan perbaikan">
                              <Send size={7} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Location */}
                      {(attendance.address || attendance.location?.location_name) && (
                        <div className="flex items-center gap-0.5">
                          <MapPin size={8} className="text-emerald-500 flex-shrink-0" />
                          <span className="text-[9px] text-gray-500 truncate">{attendance.address || attendance.location?.location_name}</span>
                        </div>
                      )}

                      {/* Status badge */}
                      <div>{getStatusBadge(attendance.attendance_status)}</div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      {isPast(day) ? (
                        <span className="text-[10px] text-red-300 font-medium">Alpha</span>
                      ) : todayMark ? (
                        <span className="text-[10px] text-gray-300">-</span>
                      ) : null}
                    </div>
                  )
                ) : dayGroup && dayGroup.length > 0 ? (
                  <div className="flex-1 space-y-1">
                    {dayGroup.slice(0, 3).map((a) => (
                      <div key={a.id} className="flex items-center gap-1 min-w-0">
                        <div className="w-4 h-4 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                          {a.employee?.photo ? (
                            <img src={a.employee.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full gradient-primary flex items-center justify-center text-white text-[7px] font-bold">
                              {a.employee?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-gray-600 truncate">{a.employee?.name?.split(' ')[0]}</span>
                        <span className={`ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusColor(a.attendance_status)}`} />
                      </div>
                    ))}
                    {dayGroup.length > 3 && (
                      <div className="text-[9px] text-gray-400 font-medium">+{dayGroup.length - 3} lainnya</div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    {todayMark ? <span className="text-[10px] text-gray-300">-</span> : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>

      {/* Detailed Table */}
      <Card title="Detail Kehadiran">
        {monthLoading ? (
          <div className="flex justify-center py-8"><div className="h-6 w-6 rounded-full border-2 border-sky-200 border-t-teal-600 animate-spin" /></div>
        ) : (monthData?.data?.items || []).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Tidak ada data kehadiran bulan ini</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200/80">
                  {!isStaff && <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Karyawan</th>}
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Tanggal</th>
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Check In</th>
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Check Out</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Jam Masuk</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Jam Pulang</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Alamat Check In</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Alamat Check Out</th>
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status</th>
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status Pulang</th>
                  {!isStaff && <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {(monthData?.data?.items || []).map((item: Attendance) => {
                  const isLiburRow = item.attendance_status === 'Libur'
                  const dateStr = item.check_in_time
                    ? new Date(item.check_in_time).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                    : item.check_out_time
                      ? new Date(item.check_out_time).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                      : '-'
                  const avatarPhoto = item.employee?.photo

                  return (
                    <tr key={item.id} className="border-b border-gray-200/80 last:border-0 hover:bg-gray-50/50">
                      {!isStaff && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {avatarPhoto ? (
                              <img src={avatarPhoto} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                {item.employee?.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{item.employee?.name || '-'}</p>
                              <p className="text-[10px] text-gray-400">{item.employee?.nik || ''}</p>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{dateStr}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          {isLiburRow ? (
                            <span className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-teal-50 text-[9px] text-teal-500 font-medium">Libur</span>
                          ) : (
                            <FaceThumbnail
                              src={item.checkin_photo_data || item.photo_data}
                              faceStatus={item.face_status}
                              faceScore={item.face_score}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center">
                          {isLiburRow ? (
                            <span className="inline-flex items-center justify-center w-14 h-14 rounded-lg bg-teal-50 text-[9px] text-teal-500 font-medium">Libur</span>
                          ) : item.checkout_photo_data ? (
                            <FaceThumbnail
                              src={item.checkout_photo_data}
                              faceStatus={item.checkout_face_status}
                              faceScore={item.checkout_face_score}
                            />
                          ) : item.check_in_time && !item.check_out_time ? (
                            <span className="inline-flex items-center justify-center w-14 h-14 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-[9px] text-amber-500 font-medium text-center px-1">
                              Belum Check Out
                            </span>
                          ) : (
                            <FaceThumbnail src={null} label="No Image" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {isLiburRow ? (
                          <span className="text-sm text-gray-300">—</span>
                        ) : item.check_in_time ? (
                          <span className="text-sm font-medium text-gray-700">{formatTime(item.check_in_time)}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-amber-500">—</span>
                            {isStaff && isPast(new Date(item.check_out_time || item.created_at).getDate()) && (
                              <button onClick={() => {
                                const d = item.check_out_time || item.created_at
                                const dateKey = new Date(d).toLocaleDateString('sv-SE')
                                setCorrectionDate(dateKey)
                                setCorrectionType('check_in')
                                setCorrectionReason('')
                                setShowCorrectionModal(true)
                              }} className="text-sky-500 hover:text-sky-700 p-0.5 rounded hover:bg-sky-50 transition-colors" title="Ajukan perbaikan jam masuk">
                                <Send size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isLiburRow ? (
                          <span className="text-sm text-gray-300">—</span>
                        ) : item.check_out_time ? (
                          <span className="text-sm font-medium text-gray-700">{formatTime(item.check_out_time)}</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-amber-500">—</span>
                            {isStaff && isPast(new Date(item.check_in_time || item.created_at).getDate()) && (
                              <button onClick={() => {
                                const d = item.check_in_time || item.created_at
                                const dateKey = new Date(d).toLocaleDateString('sv-SE')
                                setCorrectionDate(dateKey)
                                setCorrectionType('check_out')
                                setCorrectionReason('')
                                setShowCorrectionModal(true)
                              }} className="text-sky-500 hover:text-sky-700 p-0.5 rounded hover:bg-sky-50 transition-colors" title="Ajukan perbaikan jam pulang">
                                <Send size={12} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            {item.address ? (
                              <p className="text-xs text-gray-700 leading-relaxed">{item.address}</p>
                            ) : item.location?.location_name ? (
                              <p className="text-xs text-gray-700">{item.location.location_name}</p>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={12} className="text-orange-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            {item.checkout_address ? (
                              <p className="text-xs text-gray-700 leading-relaxed">{item.checkout_address}</p>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{getStatusBadge(item.attendance_status)}</td>
                      <td className="px-3 py-3 text-center">{getCheckoutBadge(item.status_checkout)}</td>
                      {!isStaff && (
                        <td className="px-3 py-3 text-center">
                          {isAdmin && (
                            <button onClick={() => openEdit(item)} className="text-sky-500 hover:text-sky-700 p-1 rounded hover:bg-sky-50 transition-colors" title="Edit jam kehadiran">
                              <Pencil size={14} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Presensi Modal */}
      <PresensiModal
        open={showPresensiModal}
        onClose={() => setShowPresensiModal(false)}
        todayAttendance={todayAttendance}
      />

      {/* Correction Modal */}
      <Modal open={showCorrectionModal} onClose={() => setShowCorrectionModal(false)} title="Ajukan Perbaikan Kehadiran">
        <div className="space-y-4">
          <div className="bg-sky-50 border border-sky-200/60 rounded-lg p-3">
            <p className="text-sm text-sky-800 font-medium">
              {correctionType === 'check_in' ? 'Perbaikan Jam Masuk' : 'Perbaikan Jam Pulang'}
            </p>
            <p className="text-xs text-sky-600 mt-0.5">Tanggal: {new Date(correctionDate + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alasan Perbaikan</label>
            <textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              rows={3}
              placeholder="Jelaskan alasan perbaikan (misal: lupa check-in, lupa check-out)..."
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCorrectionModal(false)}>Batal</Button>
            <Button
              loading={createCorrection.isPending}
              disabled={!correctionReason.trim() || correctionReason.trim().length < 10}
              onClick={() => createCorrection.mutate({
                date: correctionDate,
                ...(correctionType === 'check_in' ? { check_in_time: '00:00' } : { check_out_time: '00:00' }),
                reason: correctionReason,
              })}
            >
              <Send size={14} className="mr-2" /> Kirim Pengajuan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin Edit Attendance Modal */}
      <Modal open={showEditModal} onClose={() => { setShowEditModal(false); setEditItem(null) }} title="Edit Jam Kehadiran">
        <div className="space-y-4">
          {editItem && (
            <div className="bg-sky-50 border border-sky-200/60 rounded-lg p-3">
              <p className="text-sm text-sky-800 font-medium">{editItem.employee?.name || '-'}</p>
              <p className="text-xs text-sky-600 mt-0.5">
                {editItem.check_in_time
                  ? new Date(editItem.check_in_time).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                  : editItem.check_out_time
                    ? new Date(editItem.check_out_time).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Jam Masuk</label>
            <input
              type="datetime-local"
              value={editCheckIn}
              onChange={(e) => setEditCheckIn(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Jam Pulang</label>
            <input
              type="datetime-local"
              value={editCheckOut}
              onChange={(e) => setEditCheckOut(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditItem(null) }}>Batal</Button>
            <Button
              loading={updateAttendance.isPending}
              onClick={() => {
                if (!editItem) return
                updateAttendance.mutate({
                  id: editItem.id,
                  payload: {
                    check_in_time: editCheckIn || null,
                    check_out_time: editCheckOut || null,
                  },
                })
              }}
            >
              <Save size={14} className="mr-2" /> Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
