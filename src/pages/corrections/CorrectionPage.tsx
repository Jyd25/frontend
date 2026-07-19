import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { correctionService, type AttendanceCorrection } from '@/services/leave-correction.service'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'danger'> = { pending: 'default', approved: 'success', rejected: 'danger' }
const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }

export default function CorrectionPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role?.name === 'Administrator'
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', check_in_time: '', check_out_time: '', reason: '' })
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['corrections', page, statusFilter],
    queryFn: () => correctionService.getAll({ page, per_page: 15, ...(statusFilter && { status: statusFilter }) }),
  })

  const createMutation = useMutation({
    mutationFn: correctionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] })
      toast.success('Pengajuan perbaikan berhasil dikirim')
      setShowForm(false)
      setForm({ date: '', check_in_time: '', check_out_time: '', reason: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengajukan perbaikan'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => correctionService.approve(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] })
      toast.success('Perbaikan disetujui')
    },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => correctionService.reject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corrections'] })
      toast.success('Perbaikan ditolak')
      setRejectModal({ open: false, id: null })
      setRejectNote('')
    },
  })

  const corrections = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{isAdmin ? 'Perbaikan Absensi' : 'Pengajuan Perbaikan'}</h1>
        {!isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <AlertTriangle size={16} className="mr-2" /> Ajukan Perbaikan
          </Button>
        )}
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 mb-4">
          {['', 'pending', 'approved', 'rejected'].map((s) => (
            <Button key={s} variant={statusFilter === s ? 'primary' : 'outline'} size="sm"
              onClick={() => { setStatusFilter(s); setPage(1) }}>
              {s === '' ? 'Semua' : STATUS_LABEL[s]}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-full border-2 border-sky-200 border-t-teal-600 animate-spin" /></div>
        ) : corrections.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Tidak ada data perbaikan</p>
        ) : (
          <div className="space-y-3">
            {corrections.map((c: AttendanceCorrection) => (
              <div key={c.id} className="border border-gray-200/80 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                      {isAdmin && <span className="text-sm text-gray-500">{c.employee?.name}</span>}
                    </div>
                    <p className="text-[15px] font-semibold text-gray-900">Tanggal: {c.date}</p>
                    <p className="text-sm text-gray-600">
                      {c.check_in_time && `Masuk: ${c.check_in_time}`}
                      {c.check_in_time && c.check_out_time && ' | '}
                      {c.check_out_time && `Pulang: ${c.check_out_time}`}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{c.reason}</p>
                    {c.admin_note && <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">Catatan admin: {c.admin_note}</p>}
                  </div>
                  {isAdmin && c.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => approveMutation.mutate({ id: c.id })} loading={approveMutation.isPending}>
                        <CheckCircle size={14} className="mr-1" /> Setuju
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectModal({ open: true, id: c.id })}>
                        <XCircle size={14} className="mr-1" /> Tolak
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80 mt-4">
            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Ajukan Perbaikan Absensi">
        <div className="space-y-4">
          <Input label="Tanggal" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Jam Masuk (opsional)" type="time" value={form.check_in_time}
              onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} />
            <Input label="Jam Pulang (opsional)" type="time" value={form.check_out_time}
              onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alasan</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3} placeholder="Jelaskan alasan perbaikan (misal: lupa check-in, lupa check-out)..."
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Kirim</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null })} title="Tolak Perbaikan">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alasan Penolakan</label>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectModal({ open: false, id: null })}>Batal</Button>
            <Button variant="danger" loading={rejectMutation.isPending}
              onClick={() => rejectModal.id && rejectMutation.mutate({ id: rejectModal.id, note: rejectNote })}>Tolak</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
