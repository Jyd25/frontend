import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Camera, Upload, Trash2, CheckCircle2, XCircle, ScanFace, User } from 'lucide-react'
import { faceService, type FaceDataset } from '@/services/face-geo.service'
import { employeeService } from '@/services/employee.service'
import { loadModels, useFaceRecognition, descriptorToArray } from '@/hooks/useFaceRecognition'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import type { PaginatedResponse, Employee } from '@/types/api'

interface EmployeeWithUser extends Employee {
  users?: { id: number; name: string; email: string }
}

export default function FaceRegistrationPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null)
  const [modelsReady, setModelsReady] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const [captureResult, setCaptureResult] = useState<{ detected: boolean; descriptor?: Float32Array; score?: number } | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; face: FaceDataset | null }>({ open: false, face: null })
  const face = useFaceRecognition()

  useEffect(() => {
    loadModels().then((ok) => setModelsReady(ok))
  }, [])

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeeService.getAll({ per_page: 200 }),
    staleTime: 60000,
  })

  const { data: facesData } = useQuery({
    queryKey: ['face-history'],
    queryFn: () => faceService.getHistory(),
    staleTime: 10000,
  })

  const employees: EmployeeWithUser[] = (employeesData as PaginatedResponse<Employee> | undefined)?.data?.items ?? []
  const faces: any[] = (facesData as any)?.data ?? (Array.isArray(facesData) ? facesData : [])

  const employeeFaces = selectedEmployeeId
    ? faces.filter((f: FaceDataset) => f.employee_id === selectedEmployeeId)
    : faces

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  const registerMutation = useMutation({
    mutationFn: ({ employeeId, descriptor, image }: { employeeId: number; descriptor: number[]; image?: File }) =>
      faceService.register(employeeId, descriptor, image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-history'] })
      toast.success('Wajah berhasil didaftarkan!')
      setCaptureResult(null)
      setShowCamera(false)
      face.stopCamera()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan wajah')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => faceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-history'] })
      toast.success('Face dataset berhasil dihapus')
      setDeleteModal({ open: false, face: null })
    },
    onError: () => toast.error('Gagal menghapus face dataset'),
  })

  const handleStartCamera = async () => {
    if (!selectedEmployeeId) {
      toast.error('Pilih karyawan terlebih dahulu')
      return
    }
    setCaptureResult(null)
    const ok = await face.startCamera()
    if (!ok) {
      toast.error('Gagal mengakses kamera')
      return
    }
    setShowCamera(true)
    setTimeout(() => face.startDetection(), 500)
  }

  const handleCapture = useCallback(async () => {
    if (!selectedEmployeeId) return
    const result = await face.captureFace()
    if (!result.detected || !result.descriptor) {
      toast.error('Wajah tidak terdeteksi. Coba lagi.')
      return
    }
    setCaptureResult(result)
    face.stopDetection()
  }, [selectedEmployeeId, face])

  const handleRegister = useCallback(async () => {
    if (!selectedEmployeeId || !captureResult?.descriptor) return
    const arr = descriptorToArray(captureResult.descriptor)
    registerMutation.mutate({ employeeId: selectedEmployeeId, descriptor: arr })
  }, [selectedEmployeeId, captureResult, registerMutation])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedEmployeeId) return

    const faceapi = await import('@vladmandic/face-api')
    const img = new Image()
    img.src = URL.createObjectURL(file)
    await new Promise((resolve) => { img.onload = resolve })

    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    URL.revokeObjectURL(img.src)

    if (!detection) {
      toast.error('Tidak ada wajah terdeteksi di foto')
      return
    }

    const arr = Array.from(detection.descriptor)
    registerMutation.mutate({ employeeId: selectedEmployeeId, descriptor: arr, image: file })
    e.target.value = ''
  }, [selectedEmployeeId, registerMutation])

  const handleStopCamera = () => {
    face.stopCamera()
    setShowCamera(false)
    setCaptureResult(null)
  }

  const getEmployeeName = (employeeId: number) => {
    const emp = employees.find((e) => e.id === employeeId)
    return emp?.users?.name || emp?.nik || `#${employeeId}`
  }

  const faceCountByEmployee = (employeeId: number) => {
    return faces.filter((f: FaceDataset) => f.employee_id === employeeId).length
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Registrasi Wajah</h1>
        <p className="text-sm text-gray-500 mt-1">Daftarkan wajah karyawan untuk absensi berbasis face recognition</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Employee List */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Pilih Karyawan</h2>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {employees.map((emp) => {
                const count = faceCountByEmployee(emp.id)
                const isSelected = selectedEmployeeId === emp.id
                return (
                  <button
                    key={emp.id}
                    onClick={() => { setSelectedEmployeeId(emp.id); setShowCamera(false); setCaptureResult(null); face.stopCamera() }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${
                      isSelected ? 'gradient-primary text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {emp.users?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-medium truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {emp.users?.name || '-'}
                      </p>
                      <p className={`text-[11px] truncate ${isSelected ? 'text-white/70' : 'text-gray-500'}`}>
                        {emp.nik || '-'}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      count > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right: Capture / Register */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedEmployeeId ? (
            <Card className="p-8 text-center">
              <User size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Pilih karyawan dari daftar di sebelah kiri</p>
            </Card>
          ) : (
            <>
              <Card className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-lg">
                  {selectedEmployee?.users?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{selectedEmployee?.users?.name}</p>
                  <p className="text-sm text-gray-500">{selectedEmployee?.nik} &middot; {selectedEmployee?.department?.name || '-'}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={handleStartCamera} disabled={!modelsReady || showCamera}>
                    <Camera size={16} className="mr-1.5" />
                    Kamera
                  </Button>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!modelsReady}>
                    <Upload size={16} className="mr-1.5" />
                    Upload Foto
                  </Button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </div>
              </Card>

              {showCamera && (
                <Card className="p-4">
                  <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-[400px] mx-auto">
                    <video ref={face.videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                    <canvas ref={face.canvasRef} className="absolute inset-0 w-full h-full" />
                    {face.faceDetected ? (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-medium px-2 py-1 rounded-full">
                        <CheckCircle2 size={12} />
                        Wajah Terdeteksi ({Math.round(face.faceScore * 100)}%)
                      </div>
                    ) : (
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-medium px-2 py-1 rounded-full">
                        <XCircle size={12} />
                        Mencari wajah...
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-3 mt-4">
                    {!captureResult ? (
                      <Button variant="primary" onClick={handleCapture} disabled={!face.faceDetected}>
                        <ScanFace size={16} className="mr-1.5" />
                        Ambil Gambar
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={handleRegister} loading={registerMutation.isPending}>
                        <CheckCircle2 size={16} className="mr-1.5" />
                        Daftarkan Wajah
                      </Button>
                    )}
                    <Button variant="outline" onClick={handleStopCamera}>
                      Tutup Kamera
                    </Button>
                  </div>
                  {captureResult && (
                    <p className="text-center text-sm text-green-600 mt-2 font-medium">
                      Wajah terdeteksi! Skor: {Math.round((captureResult.score ?? 0) * 100)}%. Klik "Daftarkan Wajah" untuk menyimpan.
                    </p>
                  )}
                </Card>
              )}

              <Card className="p-4">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">
                  Wajah Terdaftar ({employeeFaces.length})
                </h2>
                {employeeFaces.length === 0 ? (
                  <div className="text-center py-6">
                    <ScanFace size={36} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">Belum ada wajah terdaftar</p>
                    <p className="text-xs text-gray-400 mt-1">Gunakan kamera atau upload foto untuk mendaftarkan</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {employeeFaces.map((faceData: FaceDataset) => (
                      <div key={faceData.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                        {(faceData as any).image_path ? (
                          <img src={(faceData as any).image_path} alt="Face" className="w-14 h-14 rounded-lg object-cover" />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ScanFace size={24} className="text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {faceData.is_primary && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Utama</span>
                            )}
                            <span className="text-xs text-gray-500">
                              {new Date(faceData.created_at).toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteModal({ open: true, face: faceData })}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, face: null })} title="Hapus Face Dataset">
        <p className="text-sm text-gray-600 mb-4">
          Hapus face dataset ini? {deleteModal.face?.is_primary && 'Face utama akan digantikan oleh data berikutnya jika ada.'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, face: null })}>Batal</Button>
          <Button variant="danger" onClick={() => deleteModal.face && deleteMutation.mutate(deleteModal.face.id)} loading={deleteMutation.isPending}>
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
