import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Camera, Upload, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { faceUpdateRequestService, type FaceUpdateRequest } from '@/services/face-geo.service'
import { useFaceRecognition } from '@/hooks/useFaceRecognition'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'danger'> = { pending: 'default', approved: 'success', rejected: 'danger' }
const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' }

export default function FaceUpdateRequestPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isAdmin = ['Administrator', 'Pimpinan'].includes(user?.role?.name ?? '')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [rejectModal, setRejectModal] = useState<{ open: boolean; id: number | null }>({ open: false, id: null })
  const [rejectNote, setRejectNote] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['face-update-requests', page, statusFilter],
    queryFn: () => faceUpdateRequestService.getAll({ page, per_page: 15, ...(statusFilter && { status: statusFilter }) }),
    staleTime: 10000,
  })

  const approveMutation = useMutation({
    mutationFn: faceUpdateRequestService.approve,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['face-update-requests'] }); toast.success('Permintaan disetujui') },
  })

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => faceUpdateRequestService.reject(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-update-requests'] })
      toast.success('Permintaan ditolak')
      setRejectModal({ open: false, id: null })
      setRejectNote('')
    },
  })

  const requests = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Update Wajah</h1>
        {!isAdmin && (
          <Button onClick={() => setShowForm(true)}>
            <Camera size={16} className="mr-2" /> Ajukan Update Wajah
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
        ) : requests.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Tidak ada data permintaan</p>
        ) : (
          <div className="space-y-3">
            {requests.map((r: FaceUpdateRequest) => (
              <div key={r.id} className="border border-gray-200/80 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      {isAdmin && <span className="text-sm text-gray-500">{r.employee?.name}</span>}
                      {r.employee?.nik && <span className="text-xs text-gray-400">({r.employee.nik})</span>}
                    </div>
                    <p className="text-xs text-gray-400">Diajukan: {new Date(r.created_at).toLocaleString('id-ID')}</p>
                    {r.admin_note && <p className="text-xs text-gray-500 mt-1">Catatan admin: {r.admin_note}</p>}
                  </div>
                  {isAdmin && r.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => approveMutation.mutate(r.id)} loading={approveMutation.isPending}>
                        <CheckCircle size={14} className="mr-1" /> Setuju
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setRejectModal({ open: true, id: r.id })}>
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

      <FaceRequestForm open={showForm} onClose={() => setShowForm(false)} />

      <Modal open={rejectModal.open} onClose={() => setRejectModal({ open: false, id: null })} title="Tolak Permintaan">
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

function FaceRequestForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { startCamera, stopCamera, startDetection, stopDetection, captureFace, videoRef, canvasRef, faceDetected } = useFaceRecognition()
  const [step, setStep] = useState<'camera' | 'confirm'>('camera')
  const [descriptor, setDescriptor] = useState<number[] | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!descriptor) throw new Error('No descriptor')
      return faceUpdateRequestService.create(descriptor)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-update-requests'] })
      toast.success('Permintaan update wajah berhasil dikirim')
      handleClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengirim permintaan'),
  })

  function handleClose() {
    stopCamera()
    stopDetection()
    setStep('camera')
    setDescriptor(null)
    setCapturedImage(null)
    onClose()
  }

  async function handleOpen() {
    await startCamera()
    startDetection()
  }

  async function handleCapture() {
    const result = await captureFace()
    if (result.detected && result.descriptor) {
      setDescriptor(Array.from(result.descriptor))
      if (videoRef.current) {
        const c = document.createElement('canvas')
        c.width = videoRef.current.videoWidth
        c.height = videoRef.current.videoHeight
        c.getContext('2d')?.drawImage(videoRef.current, 0, 0)
        setCapturedImage(c.toDataURL('image/jpeg'))
      }
      stopDetection()
      stopCamera()
      setStep('confirm')
    } else {
      toast.error('Wajah tidak terdeteksi, coba lagi')
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajukan Update Wajah">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Ambil foto wajah baru untuk mengajukan update data face recognition. Admin akan menyetujui atau menolak permintaan ini.</p>
        {step === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            </div>
            <Button onClick={handleCapture} className="w-full" disabled={!faceDetected}>
              <Camera size={16} className="mr-2" /> Ambil Foto
            </Button>
          </div>
        )}
        {step === 'confirm' && (
          <div className="space-y-3">
            {capturedImage && <img src={capturedImage} alt="Captured" className="w-full rounded-xl" />}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setStep('camera'); setDescriptor(null); setCapturedImage(null); handleOpen() }} className="flex-1">Ulangi</Button>
              <Button onClick={() => submitMutation.mutate()} loading={submitMutation.isPending} className="flex-1">Kirim Permintaan</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
