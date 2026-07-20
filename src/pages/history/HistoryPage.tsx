import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import type { Attendance } from '@/types/api'

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

function calcDuration(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return '-'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}j ${minutes}m`
}

export default function HistoryPage() {
  const [page, setPage] = useState(1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-history', page, startDate, endDate],
    queryFn: () =>
      attendanceService.getHistory({
        page,
        per_page: 10,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
    staleTime: 10000,
  })

  const columns = [
    {
      key: 'date',
      header: 'Tanggal',
      render: (item: Attendance) => {
        const d = new Date(item.check_in_time || item.created_at)
        return d.toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
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
      key: 'duration',
      header: 'Durasi',
      render: (item: Attendance) => calcDuration(item.check_in_time, item.check_out_time),
    },
    {
      key: 'attendance_status',
      header: 'Status',
      render: (item: Attendance) => getStatusBadge(item.attendance_status),
    },
    {
      key: 'location',
      header: 'Lokasi',
      render: (item: Attendance) => item.location?.location_name || item.location_status || '-',
    },
  ]

  const attendances = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Riwayat Kehadiran</h1>

      <Card>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 mb-4">
          <Input
            label="Dari Tanggal"
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
            icon={<Calendar size={16} />}
          />
          <Input
            label="Sampai Tanggal"
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
            icon={<Calendar size={16} />}
          />
          <Button
            variant="outline"
            onClick={() => { setStartDate(''); setEndDate(''); setPage(1) }}
          >
            Reset
          </Button>
        </div>

        <DataTable columns={columns} data={attendances} loading={isLoading} emptyMessage="Tidak ada data riwayat kehadiran" />

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
