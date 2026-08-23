import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import type { Attendance } from '@/types/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { invalidateAttendanceQueries } from '@/lib/queryInvalidation'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import FaceThumbnail from '@/components/ui/FaceThumbnail'
import { cn, formatTime } from '@/lib/utils'

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function getStatusBadge(status?: string) {
  switch (status) {
    case 'Hadir':
      return <Badge variant="success">Hadir</Badge>
    case 'Terlambat':
      return <Badge variant="warning">Terlambat</Badge>
    case 'Alpha':
    case 'Alpa':
      return <Badge variant="danger">{status}</Badge>
    case 'Izin':
      return <Badge variant="info">Izin</Badge>
    case 'Sakit':
      return <Badge variant="warning">Sakit</Badge>
    case 'Cuti':
      return <Badge variant="info">Cuti</Badge>
    case 'Libur':
      return <Badge variant="info">Libur</Badge>
    default:
      return <Badge>{status || '-'}</Badge>
  }
}

function getCheckoutBadge(status?: string) {
  if (!status) return null
  switch (status) {
    case 'Pulang Tepat Waktu':
      return <Badge variant="success">Pulang Tepat Waktu</Badge>
    case 'Pulang Cepat':
      return <Badge variant="warning">Pulang Cepat</Badge>
    case 'Libur':
      return <Badge variant="info">Libur</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

const emptyCell = <span className="text-red-500 font-medium">-</span>

export interface RecapRow {
  date: string
  dateLabel: string
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
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdminView = user?.role?.name === 'Administrator'

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<{ open: boolean; item: Attendance | null }>({ open: false, item: null })
  const [editData, setEditData] = useState({ check_in_time: '', check_out_time: '' })

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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { check_in_time?: string; check_out_time?: string } }) =>
      attendanceService.update(id, payload),
    onSuccess: () => {
      invalidateAttendanceQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['admin-attendance-recap'] })
      toast.success('Data kehadiran berhasil diperbarui')
      setEditModal({ open: false, item: null })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui data'),
  })

  const openEditModal = (item: Attendance) => {
    setEditData({
      check_in_time: item.check_in_time ? item.check_in_time.slice(11, 16) : '',
      check_out_time: item.check_out_time ? item.check_out_time.slice(11, 16) : '',
    })
    setEditModal({ open: true, item })
  }

  const submitEdit = () => {
    if (!editModal.item) return
    const date = (editModal.item.check_in_time || editModal.item.check_out_time || '').slice(0, 10)
    const payload: { check_in_time?: string; check_out_time?: string } = {}
    if (editData.check_in_time) payload.check_in_time = `${date}T${editData.check_in_time}`
    if (editData.check_out_time) payload.check_out_time = `${date}T${editData.check_out_time}`
    updateMutation.mutate({ id: editModal.item.id, payload })
  }

  const detailColumnsFor = (recordOf: (r: any) => Attendance | undefined, withEmployee: boolean) => [
    ...(withEmployee
      ? [{
          key: 'employee',
          header: 'Karyawan',
          render: (r: any) => {
            const a = recordOf(r)
            const ph = a?.employee?.photo || a?.checkin_photo_data || a?.photo_data
            return (
              <div className="flex items-center gap-2">
                {ph ? (
                  <img src={ph} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {a?.employee?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{a?.employee?.name || '-'}</p>
                  <p className="text-[11px] text-gray-400">{a?.employee?.nik || ''}</p>
                </div>
              </div>
            )
          },
        }]
      : []),
    { key: 'date', header: 'Tanggal', render: (r: any) => r.dateLabel },
    {
      key: 'checkin_photo',
      header: 'Check In',
      render: (r: any) => {
        const a = recordOf(r)
        return a ? (
          <FaceThumbnail src={a.checkin_photo_data || a.photo_data} faceStatus={a.face_status} faceScore={a.face_score} />
        ) : (
          <FaceThumbnail src={null} label="No Image" />
        )
      },
    },
    {
      key: 'checkout_photo',
      header: 'Check Out',
      render: (r: any) => {
        const a = recordOf(r)
        if (!a) return <FaceThumbnail src={null} label="No Image" />
        if (a.checkout_photo_data) {
          return <FaceThumbnail src={a.checkout_photo_data} faceStatus={a.face_status} faceScore={a.face_score} />
        }
        if (a.check_in_time && !a.check_out_time) {
          return <span className="inline-flex items-center justify-center w-14 h-14 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-[9px] text-amber-500 font-medium text-center px-1">Belum Check Out</span>
        }
        return <FaceThumbnail src={null} label="No Image" />
      },
    },
    {
      key: 'check_in_time',
      header: 'Jam Masuk',
      render: (r: any) => {
        const a = recordOf(r)
        if (!a) return emptyCell
        if (a.attendance_status === 'Libur') return <span className="text-gray-300">—</span>
        if (!a.check_in_time) return '-'
        return formatTime(a.check_in_time)
      },
    },
    {
      key: 'check_out_time',
      header: 'Jam Pulang',
      render: (r: any) => {
        const a = recordOf(r)
        if (!a) return emptyCell
        if (a.attendance_status === 'Libur') return <span className="text-gray-300">—</span>
        if (!a.check_out_time) return '-'
        return formatTime(a.check_out_time)
      },
    },
    {
      key: 'address',
      header: 'Alamat Check In',
      render: (r: any) => {
        const a = recordOf(r)
        return (
          <span className="text-xs text-gray-600 max-w-[160px] truncate block" title={a?.address || ''}>
            {a?.address || '-'}
          </span>
        )
      },
    },
    {
      key: 'checkout_address',
      header: 'Alamat Check Out',
      render: (r: any) => {
        const a = recordOf(r)
        return (
          <span className="text-xs text-gray-600 max-w-[160px] truncate block" title={a?.checkout_address || ''}>
            {a?.checkout_address || '-'}
          </span>
        )
      },
    },
    { key: 'status', header: 'Status', render: (r: any) => getStatusBadge(r.status) },
    {
      key: 'status_checkout',
      header: 'Status Pulang',
      render: (r: any) => getCheckoutBadge(recordOf(r)?.status_checkout),
    },
  ]

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

  if (isAdminView) {
    const items = adminQuery.data?.data?.items || []
    const totalPages = adminQuery.data?.data?.pagination?.last_page || 1

    const columns = [
      ...detailColumnsFor((a: Attendance) => a, true),
      {
        key: 'action',
        header: 'Aksi',
        className: 'text-right',
        render: (a: Attendance) => (
          <Button size="sm" variant="outline" onClick={() => openEditModal(a)}>
            <Pencil size={13} className="mr-1" /> Edit
          </Button>
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

        <DataTable columns={columns as any} data={items} loading={adminQuery.isLoading} emptyMessage="Tidak ada data absensi pada bulan ini" />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80 mt-4">
            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}

        <Modal open={editModal.open} onClose={() => setEditModal({ open: false, item: null })} title="Edit Data Kehadiran">
          <div className="space-y-4">
            {editModal.item && (
              <>
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Karyawan</span>
                    <span className="font-medium text-gray-900">{editModal.item.employee?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tanggal</span>
                    <span className="font-medium text-gray-900">
                      {(editModal.item.check_in_time || editModal.item.check_out_time || '').slice(0, 10)}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Jam Masuk" type="time" value={editData.check_in_time}
                    onChange={(e) => setEditData({ ...editData, check_in_time: e.target.value })} />
                  <Input label="Jam Pulang" type="time" value={editData.check_out_time}
                    onChange={(e) => setEditData({ ...editData, check_out_time: e.target.value })} />
                </div>
                <p className="text-[11px] text-gray-400">Kosongkan jam untuk membiarkan nilai lama tetap tersimpan.</p>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setEditModal({ open: false, item: null })}>Batal</Button>
                  <Button loading={updateMutation.isPending} onClick={submitEdit}>Simpan</Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      </div>
    )
  }

  const lastDay = new Date(year, month, 0).getDate()

  const rows: RecapRow[] = Array.from({ length: lastDay }, (_, i) => {
    const items = selfQuery.data?.data?.items || []
    const date = `${year}-${pad(month)}-${pad(i + 1)}`
    const dow = new Date(date).getDay()
    const recs = items.filter(
      (a: Attendance) => a.check_in_time?.slice(0, 10) === date || a.check_out_time?.slice(0, 10) === date
    )
    const record = recs.find((r: Attendance) => r.attendance_status !== 'Libur') || recs[0]
    const status = record?.attendance_status
    return {
      date,
      dayLabel: `${i + 1} ${MONTH_NAMES[month - 1]?.slice(0, 3)} ${year}`,
      dateLabel: `${i + 1} ${MONTH_NAMES[month - 1]?.slice(0, 3)}`,
      dayOfWeek: dow,
      isSunday: dow === 0,
      record,
      status,
      noRecord: !record,
      incomplete: !!record && (!record.check_in_time || !record.check_out_time) && status !== 'Libur',
    }
  })

  const selfDetail = detailColumnsFor((r: RecapRow) => r.record, false)

  const columns = [
    selfDetail[0],
    {
      key: 'day_name',
      header: 'Hari',
      render: (r: RecapRow) => (
        <span className={cn('text-xs', r.isSunday ? 'text-teal-600 font-semibold' : 'text-gray-500')}>{DAY_NAMES[r.dayOfWeek]}</span>
      ),
    },
    ...selfDetail.slice(1),
    ...(renderAction
      ? [{
          key: 'action',
          header: 'Aksi',
          className: 'text-right',
          render: (r: RecapRow) => renderAction(r),
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

      <DataTable columns={columns as any} data={rows} loading={selfQuery.isLoading} emptyMessage="Tidak ada hari dalam bulan ini" />
    </div>
  )
}
