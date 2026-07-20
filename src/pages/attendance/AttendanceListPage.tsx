import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Calendar } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { departmentService } from '@/services/department.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
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

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentService.getAll({ per_page: 100 }),
    staleTime: 60000,
  })

  const { data, isLoading } = useQuery({
    queryKey: ['attendances', page, dateFilter, deptFilter, statusFilter],
    queryFn: () =>
      attendanceService.getAll({
        page,
        per_page: 10,
        date: dateFilter || undefined,
        department_id: deptFilter ? Number(deptFilter) : undefined,
        status: statusFilter || undefined,
      }),
    staleTime: 10000,
  })

  const columns = [
    {
      key: 'employee',
      header: 'Karyawan',
      render: (item: Attendance) => item.employee?.name || '-',
    },
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
      key: 'location_status',
      header: 'Status Lokasi',
      render: (item: Attendance) => item.location_status || '-',
    },
    {
      key: 'face_status',
      header: 'Status Wajah',
      render: (item: Attendance) => item.face_status || '-',
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
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1) }}
              className="w-48"
            />
          </div>
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
