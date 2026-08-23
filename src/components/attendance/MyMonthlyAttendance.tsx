import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendanceService } from '@/services/attendance.service'
import type { Attendance } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
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
  renderAction?: (row: RecapRow) => React.ReactNode
}

export default function MyMonthlyAttendance({ renderAction }: Props) {
  const user = useAuthStore((s) => s.user)
  const isAdminView = ['Administrator', 'Pimpinan'].includes(user?.role?.name || '')

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [page, setPage] = useState(1)

  const pad = (n: number) => String(n).padStart(2, '0')

  const selfQuery = useQuery({
    queryKey: ['my-attendance-recap', year, month],
    queryFn: () => {
      const lastDay = new Date(year, month, 0).getDate()
      return attendanceService.getHistory({
        start_date: `${year}-${pad(month)}-01`,
        end_date: `${year}-${pad(month)}-${pad(lastDay)}`,
        per_page: 100,
      })
    },
    staleTime: 10000,
    enabled: !isAdminView,
  })

  const adminQuery = useQuery({
    queryKey: ['admin-attendance-recap', page, month, year],
    queryFn: () => attendanceService.getAll({ month, year, page, per_page: 50 }),
    staleTime: 10000,
    enabled: isAdminView,
  })

  const monthSelectors = (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => { setMonth(Number(e.target.value)); setPage(1) }}
        className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
      >
        {MONTH_NAMES.map((m, i) => (
          <option key={m} value={i + 1}>{m}</option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => { setYear(Number(e.target.value)); setPage(1) }}
        className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
      >
        {Array.from({ length: 3 }, (_, i) => now.getFullYear() - i).map((y) => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  )

  const lastDay = new Date(year, month, 0).getDate()

  const rows = useMemo<RecapRow[]>(() => {
    const items = selfQuery.data?.data?.items || []
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
  }, [selfQuery.data, year, month, lastDay])

  if (isAdminView) {
    const items = adminQuery.data?.data?.items || []
    const totalPages = adminQuery.data?.data?.pagination?.last_page || 1

    const columns = [
      {
        key: 'date',
        header: 'Tanggal',
        render: (a: Attendance) => {
          const src = a.check_in_time || a.check_out_time || a.created_at
          return (
            <div>
              <p className="font-medium text-gray-900">{src.slice(0, 10)}</p>
              <p className="text-xs text-gray-400">{DAY_NAMES[new Date(src).getDay()]}</p>
            </div>
          )
        },
      },
      {
        key: 'employee',
        header: 'Karyawan',
        render: (a: Attendance) => (
          <span className="font-medium text-gray-900">{a.employee?.name || '-'}</span>
        ),
      },
      {
        key: 'check_in',
        header: 'Jam Masuk',
        render: (a: Attendance) =>
          a.check_in_time ? (
            <span className="text-gray-900">{a.check_in_time.slice(11, 16)}</span>
          ) : (
            <span className="text-red-500 font-medium">-</span>
          ),
      },
      {
        key: 'check_out',
        header: 'Jam Pulang',
        render: (a: Attendance) =>
          a.check_out_time ? (
            <span className="text-gray-900">{a.check_out_time.slice(11, 16)}</span>
          ) : (
            <span className="text-red-500 font-medium">-</span>
          ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (a: Attendance) =>
          a.attendance_status ? (
            <Badge variant={STATUS_VARIANT[a.attendance_status] || 'default'}>{a.attendance_status}</Badge>
          ) : (
            <Badge variant="danger">Tanpa Data</Badge>
          ),
      },
      {
        key: 'remarks',
        header: 'Keterangan',
        render: (a: Attendance) => (
          <span className="text-gray-500 text-xs max-w-[220px] block truncate" title={a.remarks}>
            {a.remarks || '-'}
          </span>
        ),
      },
    ]

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-900">Rekap Absensi Semua Karyawan</h2>
            <p className="text-xs text-gray-400 mt-0.5">Data absensi seluruh karyawan selama satu bulan.</p>
          </div>
          {monthSelectors}
        </div>

        <DataTable columns={columns} data={items} loading={adminQuery.isLoading} emptyMessage="Tidak ada data absensi pada bulan ini" />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80 mt-4">
            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

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
    ...(renderAction
      ? [{
          key: 'action',
          header: 'Aksi',
          className: 'text-right',
          render: (row: RecapRow) => renderAction(row),
        }]
      : []),
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
        {monthSelectors}
      </div>

      <DataTable columns={columns} data={rows} loading={selfQuery.isLoading} emptyMessage="Tidak ada hari dalam bulan ini" />
    </div>
  )
}
