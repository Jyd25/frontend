import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, Send, Table } from 'lucide-react'
import { toast } from 'sonner'
import { emailReportService, type EmailReportItem } from '@/services/email-report.service'
import { departmentService } from '@/services/department.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusBadge(item: EmailReportItem) {
  if (item.status === 'sent') {
    return <Badge variant="success">Terkirim</Badge>
  }
  if (item.status === 'pending') {
    return <Badge variant="warning">Mengirim...</Badge>
  }
  if (item.status === 'failed') {
    return <Badge variant="danger">Gagal</Badge>
  }
  return <Badge variant="default">{item.has_attendance ? 'Belum Dikirim' : 'Tidak Ada Data'}</Badge>
}

export default function EmailReportPage() {
  const queryClient = useQueryClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('sv-SE')
  const today = now.toLocaleDateString('sv-SE')

  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [deptId, setDeptId] = useState('')
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf')
  const [confirmOpen, setConfirmOpen] = useState(false)

  const { data: depts } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentService.getAll({ per_page: 100 }),
    staleTime: 60000,
  })

  const periodReady = !!startDate && !!endDate && endDate >= startDate

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['email-reports-status', startDate, endDate, deptId],
    queryFn: () =>
      emailReportService.getStatus({
        start_date: startDate,
        end_date: endDate,
        department_id: deptId ? Number(deptId) : undefined,
      }),
    enabled: periodReady,
    refetchInterval: 30000,
  })

  const items = data?.items || []

  const { usersWithData, notSent, sentCount, failedCount } = useMemo(() => {
    const withData = items.filter((i) => i.has_attendance)
    return {
      usersWithData: withData.length,
      notSent: items.filter((i) => i.status === 'not_sent' && i.has_attendance).length,
      sentCount: items.filter((i) => i.status === 'sent').length,
      failedCount: items.filter((i) => i.status === 'failed').length,
    }
  }, [items])

  const sendAllMutation = useMutation({
    mutationFn: () =>
      emailReportService.sendAll({
        start_date: startDate,
        end_date: endDate,
        department_id: deptId ? Number(deptId) : undefined,
        format,
      }),
    onSuccess: (res) => {
      toast.success(res.message)
      setConfirmOpen(false)
      queryClient.invalidateQueries({ queryKey: ['email-reports-status', startDate, endDate, deptId] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Gagal mengirim email laporan')
    },
  })

  const sendOneMutation = useMutation({
    mutationFn: (item: EmailReportItem) =>
      emailReportService.sendOne({
        user_id: item.user_id,
        start_date: startDate,
        end_date: endDate,
        format,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Email laporan sedang dikirim')
      queryClient.invalidateQueries({ queryKey: ['email-reports-status', startDate, endDate, deptId] })
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Gagal mengirim email laporan')
    },
  })

  const deptList = depts?.data?.items || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Kirim Email Laporan</h1>
      <p className="text-center text-sm text-gray-500 -mt-4">
        Setiap user menerima laporan kehadiran dirinya sendiri, dikirim ke email masing-masing.
      </p>

      <Card title="Filter Periode">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <Input label="Dari Tanggal" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Departemen</label>
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
            >
              <option value="">Semua Departemen</option>
              {deptList.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Format Lampiran</label>
            <div className="flex gap-2">
              {(['pdf', 'excel'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    format === f
                      ? 'border-sky-400 bg-sky-50 text-sky-700 ring-2 ring-sky-500/20'
                      : 'border-gray-200/80 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {f === 'pdf' ? 'PDF' : 'Excel (.xlsx)'}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!periodReady}
            className="whitespace-nowrap"
          >
            <Send size={14} className="mr-1" /> Kirim Ke Semua
          </Button>
        </div>
      </Card>

      <Card title="Cepat">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date()
              setStartDate(new Date(n.getFullYear(), n.getMonth(), 1).toLocaleDateString('sv-SE'))
              setEndDate(n.toLocaleDateString('sv-SE'))
            }}
          >
            <Table size={14} className="mr-1" /> Bulan Ini
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date()
              const day = n.getDay()
              const diff = n.getDate() - day + (day === 0 ? -6 : 1)
              const start = new Date(n.setDate(diff))
              const end = new Date(start)
              end.setDate(start.getDate() + 6)
              setStartDate(start.toLocaleDateString('sv-SE'))
              setEndDate(end.toLocaleDateString('sv-SE'))
            }}
          >
            <Table size={14} className="mr-1" /> Minggu Ini
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date()
              const start = new Date(n.getFullYear(), n.getMonth() - 1, 1)
              const end = new Date(n.getFullYear(), n.getMonth(), 0)
              setStartDate(start.toLocaleDateString('sv-SE'))
              setEndDate(end.toLocaleDateString('sv-SE'))
            }}
          >
            <Table size={14} className="mr-1" /> Bulan Lalu
          </Button>
        </div>
      </Card>

      <Card
        title="Status Kirim Email"
        description={
          periodReady
            ? `${items.length} user • ${usersWithData} dengan data • ${sentCount} terkirim • ${failedCount} gagal • ${notSent} belum`
            : undefined
        }
      >
        {!periodReady ? (
          <p className="text-gray-400 text-sm text-center py-4">Pilih periode terlebih dahulu</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 rounded-full border-2 border-sky-200 border-t-teal-600 animate-spin" />
          </div>
        ) : isError ? (
          <p className="text-red-400 text-sm text-center py-4">
            Gagal memuat status pengiriman email. Periksa koneksi ke server.
          </p>
        ) : items.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Tidak ada user ber-email yang terdaftar</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200/80">
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Nama</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Email Tujuan</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Data Absensi</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Format</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Status</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Waktu Terkirim</th>
                  <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.user_id} className="border-b border-gray-200/80 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">NIK {item.nik || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{item.email}</td>
                    <td className="px-3 py-2 text-center">
                      {item.has_attendance ? (
                        <Badge variant="info">{item.records_count} catatan</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 uppercase">{item.format || '-'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        {statusBadge(item)}
                        {item.status === 'failed' && item.error_message && (
                          <span className="text-xs text-red-400 max-w-[280px] truncate" title={item.error_message}>
                            {item.error_message}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600 whitespace-nowrap">
                      {formatDateTime(item.sent_at)}
                    </td>
                    <td className="px-3 py-2 text-center">
  {!item.employee_id || !item.has_attendance ? (
    <span
      className="text-gray-300"
      title={item.employee_id ? 'Tidak ada data kehadiran untuk periode ini' : 'User tidak memiliki data karyawan'}
    >
      -
    </span>
  ) : (
    <Button
      size="sm"
      variant="outline"
      onClick={() => sendOneMutation.mutate(item)}
      loading={sendOneMutation.isPending && item.user_id === sendOneMutation.variables?.user_id}
    >
      <Mail size={14} className="mr-1" />{' '}
      {item.status === 'failed' ? 'Kirim Ulang' : item.status === 'sent' ? 'Kirim Lagi' : 'Kirim'}
    </Button>
  )}
</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Kirim Email ke Semua User">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Laporan kehadiran <span className="font-semibold text-gray-900">per user</span> periode{' '}
            <span className="font-semibold text-gray-900">{startDate} s/d {endDate}</span> akan dikirim sebagai lampiran{' '}
            <span className="font-semibold text-gray-900 uppercase">{format}</span> ke email masing-masing user.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-semibold text-gray-900">{usersWithData} user</span> dengan data kehadiran akan menerima
            email ({notSent} di antaranya belum terkirim). User tanpa data tidak menerima email dan tidak dinotifikasi.
          </p>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => sendAllMutation.mutate()} loading={sendAllMutation.isPending}>
              <Send size={14} className="mr-1" /> Kirim Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {isFetching && !isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
          <RefreshCw size={12} className="animate-spin" /> Memuat ulang status...
        </div>
      )}
    </div>
  )
}