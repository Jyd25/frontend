import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Clock, MapPin, Camera, ChevronLeft, ChevronRight, AlertTriangle, Send, X } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { correctionService } from '@/services/leave-correction.service'
import { useAuthStore } from '@/stores/useAuthStore'
import PresensiModal from '@/components/attendance/PresensiModal'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Attendance } from '@/types/api'

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

function getStatusBadge(status?: string) {
  switch (status) {
    case 'Hadir': return <Badge variant="success">Hadir</Badge>
    case 'Terlambat': return <Badge variant="warning">Terlambat</Badge>
    case 'Alpha': return <Badge variant="danger">Alpha</Badge>
    case 'Izin': return <Badge variant="info">Izin</Badge>
    case 'Sakit': return <Badge variant="warning">Sakit</Badge>
    default: return <Badge>{status || '-'}</Badge>
  }
}

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')

  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  const [showPresensiModal, setShowPresensiModal] = useState(false)
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [correctionDate, setCorrectionDate] = useState('')
  const [correctionType, setCorrectionType] = useState<'check_in' | 'check_out'>('check_in')
  const [correctionReason, setCorrectionReason] = useState('')

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

  const createCorrection = useMutation({
    mutationFn: correctionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] })
      toast.success('Pengajuan perbaikan berhasil dikirim')
      setShowCorrectionModal(false)
      setCorrectionDate('')
      setCorrectionReason('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengajukan perbaikan'),
  })

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay()

  const attendanceMap = useMemo(() => {
    const map: Record<string, Attendance> = {}
    const items = monthData?.data?.items || []
    for (const item of items) {
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
  }, [monthData])

  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d)

  function formatTimeShort(iso?: string) {
    if (!iso) return '-'
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function formatDateKey(day: number) {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function openCorrection(day: number, type: 'check_in' | 'check_out') {
    setCorrectionDate(formatDateKey(day))
    setCorrectionType(type)
    setCorrectionReason('')
    setShowCorrectionModal(true)
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
        <Button onClick={() => setShowPresensiModal(true)}>
          <Camera size={16} className="mr-2" /> Presensi Sekarang
        </Button>
      </div>

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
            const attendance = attendanceMap[dateKey]
            const hasData = !!attendance
            const todayMark = isToday(day)

            return (
              <div key={day} className={`bg-white min-h-[100px] sm:min-h-[120px] p-2 flex flex-col ${todayMark ? 'ring-2 ring-inset ring-sky-400/40' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold ${todayMark ? 'text-sky-600' : isPast(day) && !hasData ? 'text-gray-300' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {todayMark && <span className="text-[9px] font-bold text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded-full">HARI INI</span>}
                  {hasData && (
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                      backgroundColor: attendance.attendance_status === 'Hadir' || attendance.attendance_status === 'Present' ? '#22c55e'
                        : attendance.attendance_status === 'Terlambat' || attendance.attendance_status === 'Late' ? '#f59e0b'
                        : attendance.attendance_status === 'Izin' || attendance.attendance_status === 'Permission' ? '#3b82f6'
                        : attendance.attendance_status === 'Sakit' || attendance.attendance_status === 'Leave' ? '#f59e0b'
                        : '#ef4444'
                    }} />
                  )}
                </div>

                {hasData ? (
                  <div className="flex-1 space-y-1">
                    {/* Face photo thumbnail */}
                    {attendance.photo_data && (
                      <div className={`w-7 h-7 rounded-md overflow-hidden border flex-shrink-0 ${
                        attendance.face_status === 'Matched' || attendance.face_status === 'matched' ? 'border-emerald-400' : 'border-amber-400'
                      }`}>
                        <img src={attendance.photo_data} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* Times */}
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1">
                        <Clock size={9} className="text-sky-500 flex-shrink-0" />
                        <span className={`text-[10px] ${attendance.check_in_time ? 'text-gray-700 font-medium' : 'text-amber-500'}`}>
                          {attendance.check_in_time ? formatTimeShort(attendance.check_in_time) : '—'}
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
                          {attendance.check_out_time ? formatTimeShort(attendance.check_out_time) : '—'}
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
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Verifikasi Wajah</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Jam Masuk</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Jam Pulang</th>
                  <th className="px-3 py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Lokasi + Alamat</th>
                  <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status</th>
                  {!isStaff && <th className="px-3 py-2.5 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {(monthData?.data?.items || []).map((item: Attendance) => {
                  const dateStr = item.check_in_time
                    ? new Date(item.check_in_time).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                    : item.check_out_time
                      ? new Date(item.check_out_time).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
                      : '-'

                  return (
                    <tr key={item.id} className="border-b border-gray-200/80 last:border-0 hover:bg-gray-50/50">
                      {!isStaff && (
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            {item.photo_data ? (
                              <img src={item.photo_data} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
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
                        {item.photo_data ? (
                          <div className={`inline-block relative w-10 h-10 rounded-lg overflow-hidden border-2 ${
                            item.face_status === 'Matched' || item.face_status === 'matched' ? 'border-emerald-400' : 'border-amber-400'
                          }`}>
                            <img src={item.photo_data} alt="Wajah" className="w-full h-full object-cover" />
                            <div className={`absolute bottom-0 inset-x-0 text-center text-[8px] font-bold text-white leading-tight ${
                              item.face_status === 'Matched' || item.face_status === 'matched' ? 'bg-emerald-600/90' : 'bg-amber-500/90'
                            }`}>
                              {item.face_score ?? 0}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {item.check_in_time ? (
                          <span className="text-sm font-medium text-gray-700">{formatTimeShort(item.check_in_time)}</span>
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
                        {item.check_out_time ? (
                          <span className="text-sm font-medium text-gray-700">{formatTimeShort(item.check_out_time)}</span>
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
                            {item.location?.location_name && (
                              <p className="text-[10px] text-gray-400 mt-0.5">{item.location.location_name}</p>
                            )}
                            {item.location_status && (
                              <p className="text-[10px] text-gray-400">
                                {item.location_status}
                                {item.distance != null && ` (${Math.round(item.distance)}m)`}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{getStatusBadge(item.attendance_status)}</td>
                      {!isStaff && <td className="px-3 py-3 text-center">-</td>}
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
    </div>
  )
}
