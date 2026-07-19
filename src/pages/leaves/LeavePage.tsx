import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
import { leaveService, type LeaveRequest } from '@/services/leave-correction.service'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

const TYPE_LABEL: Record<string, string> = { permission: 'Izin', sick: 'Sakit', leave: 'Cuti' }
const TYPE_VARIANT: Record<string, 'default' | 'warning' | 'info'> = { permission: 'default', sick: 'warning', leave: 'info' }
const STATUS_VARIANT: Record<string, 'default' | 'success' | 'danger'> = { pending: 'default', approved: 'success', rejected: 'danger' }
const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }

export default function LeavePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role?.name === 'Administrator'
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'permission', start_date: '', end_date: '', reason: '' })
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', page, statusFilter],
    queryFn: () => leaveService.getAll({ page, per_page: 15, ...(statusFilter && { status: statusFilter }) }),
  })

  const createMutation = useMutation({
    mutationFn: leaveService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Pengajuan izin berhasil dikirim')
      setShowForm(false)
      setForm({ type: 'permission', start_date: '', end_date: '', reason: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengajukan izin'),
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => leaveService.approve(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Izin disetujui')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => leaveService.reject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Izin ditolak')
      setRejectModal({ open: false, id: null })
      setRejectNote('')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal'),
  })

  const deleteMutation = useMutation({
    mutationFn: leaveService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] })
      toast.success('Pengajuan dihapus')
    },
  })

  const leaves = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">{isAdmin ? 'Persetujuan Izin' : 'Pengajuan Izin'}</h1>
        {!isAdmin && <Button onClick={() => setShowForm(true)}><Plus size={16} className="mr-2" /> Ajukan Izin</Button>}
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
        ) : leaves.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Tidak ada data izin</p>
        ) : (
          <div className="space-y-3">
            {leaves.map((l: LeaveRequest) => (
              <div key={l.id} className="border border-gray-200/80 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={TYPE_VARIANT[l.type]}>{TYPE_LABEL[l.type]}</Badge>
                      <Badge variant={STATUS_VARIANT[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                      {isAdmin && <span className="text-sm text-gray-500">{l.employee?.name}</span>}
                    </div>
                    <p className="text-[15px] font-semibold text-gray-900">{l.start_date} s/d {l.end_date}</p>
                    <p className="text-sm text-gray-600 mt-1">{l.reason}</p>
                    {l.admin_note && <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">Catatan admin: {l.admin_note}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isAdmin && l.status === 'pending' && (
                      <>
                        <Button size="sm" onClick={() => approveMutation.mutate({ id: l.id })} loading={approveMutation.isPending}>
                          <CheckCircle size={14} className="mr-1" /> Setuju
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setRejectModal({ open: true, id: l.id })}>
                          <XCircle size={14} className="mr-1" /> Tolak
                        </Button>
                      </>
                    )}
                    {!isAdmin && l.status === 'pending' && (
                      <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(l.id)}>
                        <Trash2 size={14} className="text-red-500" />
                      </Button>
                    )}
                  </div>
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
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Ajukan Izin">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Jenis Izin</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors">
              <option value="permission">Izin</option>
              <option value="sick">Sakit</option>
              <option value="leave">Cuti</option>
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Dari Tanggal" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            <Input label="Sampai Tanggal" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alasan</label>
            <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}
              rows={3} placeholder="Jelaskan alasan izin..."
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors" />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button loading={createMutation.isPending} onClick={() => createMutation.mutate(form)}>Kirim</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null })} title="Tolak Izin">
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
