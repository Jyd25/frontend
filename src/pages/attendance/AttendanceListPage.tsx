import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Calendar, MapPin } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { departmentService } from '@/services/department.service'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import FaceThumbnail from '@/components/ui/FaceThumbnail'
import type { Attendance } from '@/types/api'

function formatDateTime(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'Hadir':
      return <Badge variant="success">Hadir</Badge>
    case 'Terlambat':
      return <Badge variant="warning">Terlambat</Badge>
    case 'Alpha':
      return <Badge variant="danger">Alpha</Badge>
    case 'Izin':
      return <Badge variant="info">Izin</Badge>
    case 'Sakit':
      return <Badge variant="warning">Sakit</Badge>
    default:
      return <Badge>{status || '-'}</Badge>
  }
}

export default function AttendanceListPage() {
  const [page, setPage] = useState(1)
  const [dateFilter, setDateFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { user } = useAuthStore()
  const isStaff = ['Guru', 'Karyawan'].includes(user?.role?.name ?? '')

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentService.getAll({ per_page: 100 }),
    staleTime: 60000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['attendances', page, dateFilter, deptFilter, statusFilter, searchTerm],
    queryFn: () =>
      attendanceService.getAll({
        page,
        per_page: 10,
        date: dateFilter || undefined,
        department_id: deptFilter ? Number(deptFilter) : undefined,
        status: statusFilter || undefined,
        search: searchTerm || undefined,
      }),
    staleTime: 10000,
  })

const columns = [
    ...(!isStaff ? [{
      key: 'employee_name',
      header: 'Karyawan',
      render: (item: Attendance) => {
        const photo = item.checkin_photo_data || item.photo_data
        return (
          <div className="flex items-center gap-2">
            {photo ? (
              <img src={photo} alt="Wajah" className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {item.employee?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.employee?.name || '-'}</p>
              <p className="text-[11px] text-gray-400">{item.employee?.nik || ''}</p>
            </div>
          </div>
        )
      },
    }] : []),
    {
      key: 'date',
      header: 'Tanggal',
      render: (item: Attendance) => {
        const d = new Date(item.check_in_time || item.created_at)
        return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
      },
    },
    {
      key: 'check_in_time',
      header: 'Jam Masuk',
      render: (item: Attendance) => {
        if (!item.check_in_time) return '-'
        return new Date(item.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      key: 'check_out_time',
      header: 'Jam Pulang',
      render: (item: Attendance) => {
        if (!item.check_out_time) return '-'
        return new Date(item.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      },
    },
    {
      key: 'attendance_status',
      header: 'Status',
      render: (item: Attendance) => getStatusBadge(item.attendance_status),
    },
    {
      key: 'location',
      header: 'Lokasi',
      render: (item: Attendance) => item.location?.location_name || '-',
    },
    {
      key: 'location_details',
      header: 'Detail Lokasi',
      render: (item: Attendance) => {
        if (!item.latitude || !item.longitude) return '-'
        return (
          <div className="flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" />
            <span className="text-[11px]">{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
          </div>
        )
      },
    },
    {
      key: 'checkin_photo',
      header: 'Check In',
      render: (item: Attendance) => (
        <FaceThumbnail
          src={item.checkin_photo_data || item.photo_data}
          faceStatus={item.face_status}
          faceScore={item.face_score}
        />
      ),
    },
    {
      key: 'checkout_photo',
      header: 'Check Out',
      render: (item: Attendance) => {
        if (item.checkout_photo_data) {
          return (
            <FaceThumbnail
              src={item.checkout_photo_data}
              faceStatus={item.face_status}
              faceScore={item.face_score}
            />
          )
        }
        if (item.check_in_time && !item.check_out_time) {
          return <span className="inline-flex items-center justify-center w-14 h-14 rounded-lg border border-dashed border-amber-300 bg-amber-50 text-[9px] text-amber-500 font-medium text-center px-1">Belum Check Out</span>
        }
        return <FaceThumbnail src={null} label="No Image" />
      },
    },
  ]

  const attendances = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1
  const deptList = departments?.data?.items || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Daftar Kehadiran</h1>

      <Card>
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama / NIK..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
              className="w-48"
            />
          </div>
          {!isStaff && (
            <>
              <select
                value={deptFilter}
                onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Semua Departemen</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
                className="px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Semua Status</option>
                <option value="present">Hadir</option>
                <option value="late">Terlambat</option>
                <option value="absent">Alpha</option>
                <option value="permission">Izin</option>
                <option value="sick">Sakit</option>
              </select>
            </>
          )}
        </div>

        <DataTable columns={columns} data={attendances} loading={isLoading} emptyMessage="Tidak ada data kehadiran" />

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80">
            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
