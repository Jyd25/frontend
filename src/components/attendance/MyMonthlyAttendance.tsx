import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceService } from '@/services/attendance.service'
import type { Attendance } from '@/types/api'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'info' | 'danger'> = {
  Hadir: 'success',
  Terlambat: 'warning',
  Izin: 'info',
  Sakit: 'warning',
  Cuti: 'info',
  Alpa: 'danger',
  Libur: 'info',
}

export interface RecapRow {
  date: string
  dayLabel: string
  dayOfWeek: number
  isSunday: boolean
  record?: Attendance
  status?: string
  noRecord: boolean
  incomplete: boolean
}

interface Props {
  renderAction: (row: RecapRow) => React.ReactNode
}

export default function MyMonthlyAttendance({ renderAction }: Props) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const pad = (n: number) => String(n).padStart(2, '0')
  const start = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${pad(month)}-${pad(lastDay)}`

  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance-recap', start, end],
    queryFn: () => attendanceService.getHistory({ start_date: start, end_date: end, per_page: 100 }),
    staleTime: 10000,
  })

  const rows = useMemo<RecapRow[]>(() => {
    const items = data?.data?.items || []
    return Array.from({ length: lastDay }, (_, i) => {
      const date = `${year}-${pad(month)}-${pad(i + 1)}`
      const dow = new Date(date).getDay()
      const recs = items.filter(
        (a: Attendance) => a.check_in_time?.slice(0, 10) === date || a.check_out_time?.slice(0, 10) === date
      )
      const record = recs.find((r: Attendance) => r.attendance_status !== 'Libur') || recs[0]
      const status = record?.attendance_status
      return {
        date,
        dayLabel: `${i + 1} ${MONTH_NAMES[month - 1]?.slice(0, 3)}`,
        dayOfWeek: dow,
        isSunday: dow === 0,
        record,
        status,
        noRecord: !record,
        incomplete: !!record && (!record.check_in_time || !record.check_out_time) && status !== 'Libur',
      }
    })
  }, [data, year, month, lastDay])

  const columns = [
    {
      key: 'date',
      header: 'Tanggal',
      render: (row: RecapRow) => (
        <div>
          <p className="font-medium text-gray-900">{row.dayLabel}</p>
          <p className={cn('text-xs', row.isSunday ? 'text-teal-600 font-medium' : 'text-gray-400')}>{DAY_NAMES[row.dayOfWeek]}</p>
        </div>
      ),
    },
    {
      key: 'check_in',
      header: 'Jam Masuk',
      render: (row: RecapRow) =>
        row.record?.check_in_time ? (
          <span className="text-gray-900">{row.record.check_in_time.slice(11, 16)}</span>
        ) : (
          <span className="text-red-500 font-medium">-</span>
        ),
    },
    {
      key: 'check_out',
      header: 'Jam Pulang',
      render: (row: RecapRow) =>
        row.record?.check_out_time ? (
          <span className="text-gray-900">{row.record.check_out_time.slice(11, 16)}</span>
        ) : (
          <span className="text-red-500 font-medium">-</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: RecapRow) =>
        row.status ? (
          <Badge variant={STATUS_VARIANT[row.status] || 'default'}>{row.status}</Badge>
        ) : (
          <Badge variant="danger">Tanpa Data</Badge>
        ),
    },
    {
      key: 'remarks',
      header: 'Keterangan',
      render: (row: RecapRow) => (
        <span className="text-gray-500 text-xs max-w-[220px] block truncate" title={row.record?.remarks}>
          {row.record?.remarks || (row.incomplete ? 'Absensi belum lengkap' : '')}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      className: 'text-right',
      render: (row: RecapRow) => renderAction(row),
    },
  ]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">Rekap Kehadiran Saya</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Baris bertanda merah berarti data kosong atau belum lengkap pada bulan tersebut.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
          >
            {Array.from({ length: 3 }, (_, i) => now.getFullYear() - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable columns={columns} data={rows} loading={isLoading} emptyMessage="Tidak ada hari dalam bulan ini" />
    </div>
  )
}
