import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff, Save, Camera, Upload, CheckCircle2, XCircle, ScanFace, Trash2, Image } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { authService } from '@/services/auth.service'
import { faceService, type FaceDataset } from '@/services/face-geo.service'
import { loadModels, useFaceRecognition, descriptorToArray } from '@/hooks/useFaceRecognition'
import api from '@/lib/axios'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { ApiResponse } from '@/types/api'

type ProfileTab = 'profile' | 'password' | 'face'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<ProfileTab>('profile')

  const { data: profileData } = useQuery({
    queryKey: ['profile-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/profile')
      return data.data
    },
    staleTime: 30000,
  })

  const employee = profileData?.employee
  const employeeId = employee?.id

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Profil Saya</h1>

      {/* Header with avatar */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          {employee?.photo ? (
            <img src={employee.photo} alt={user?.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-sky-200 shadow-sm" />
          ) : (
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
            <p className="text-sm text-gray-500">{user?.role?.name} &middot; Cahaya Rancamaya Islamic Boarding School</p>
            {employee && (
              <p className="text-xs text-gray-400 mt-1">NIK: {employee.nik}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Tab buttons */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-sm">
        <button onClick={() => setTab('profile')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Edit Profil
        </button>
        <button onClick={() => setTab('password')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Ubah Password
        </button>
        <button onClick={() => setTab('face')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'face' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Foto Wajah
        </button>
      </div>

      {tab === 'profile' && <ProfileEditTab employee={employee} />}
      {tab === 'password' && <PasswordTab />}
      {tab === 'face' && employeeId && <FaceTab employeeId={employeeId} employeeName={user?.name || ''} />}
    </div>
  )
}

function ProfileEditTab({ employee }: { employee: any }) {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: employee?.phone || '',
    address: employee?.address || '',
    birth_place: employee?.birth_place || '',
    birth_date: employee?.birth_date ? employee.birth_date.split('T')[0] : '',
  })

  const profileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<ApiResponse<any>>('/profile', form)
      return data.data
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['profile-full'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil berhasil diperbarui')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui profil'),
  })

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await api.put<ApiResponse<any>>('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['profile-full'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Foto profil berhasil diperbarui')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui foto profil'),
  })

  return (
    <Card>
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {user?.employee?.photo ? (
              <img src={user.employee.photo} alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-sky-200" />
            ) : (
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={20} className="text-white" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Foto Profil</p>
            <p className="text-xs text-gray-500">Klik foto untuk mengubah avatar</p>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) avatarMutation.mutate(file)
                e.target.value = ''
              }} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Nama Lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} icon={<User size={16} />} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} icon={<Mail size={16} />} />
          <Input label="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone size={16} />} />
          <Input label="Tempat Lahir" value={form.birth_place} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} />
          <Input label="Tanggal Lahir" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} icon={<Calendar size={16} />} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alamat</label>
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3}
            className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors" />
        </div>

        {employee && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500 mb-3">Data Karyawan (Read Only)</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">NIK</p>
                <p className="text-sm font-medium text-gray-700">{employee.nik}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">Departemen</p>
                <p className="text-sm font-medium text-gray-700">{employee.department?.name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">Jabatan</p>
                <p className="text-sm font-medium text-gray-700">{employee.position?.name || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">Jadwal</p>
                <p className="text-sm font-medium text-gray-700">{employee.schedule ? `${employee.schedule.start_time} - ${employee.schedule.end_time}` : '-'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[10px] text-gray-400 uppercase">Status</p>
                <Badge variant={employee.is_active ? 'success' : 'danger'}>{employee.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button loading={profileMutation.isPending} onClick={() => profileMutation.mutate()}>
            <Save size={16} className="mr-2" /> Simpan Perubahan
          </Button>
        </div>
      </div>
    </Card>
  )
}

function PasswordTab() {
  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const passwordMutation = useMutation({
    mutationFn: () => authService.changePassword(pwd.current, pwd.new, pwd.confirm),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      setPwd({ current: '', new: '', confirm: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengubah password'),
  })

  return (
    <Card>
      <div className="space-y-4 max-w-md">
        <div className="relative">
          <Input label="Password Saat Ini" type={showCurrent ? 'text' : 'password'} value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })} icon={<Lock size={16} />} />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="relative">
          <Input label="Password Baru" type={showNew ? 'text' : 'password'} value={pwd.new}
            onChange={(e) => setPwd({ ...pwd, new: e.target.value })} icon={<Lock size={16} />} />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="relative">
          <Input label="Konfirmasi Password Baru" type={showConfirm ? 'text' : 'password'} value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} icon={<Lock size={16} />} />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex justify-end pt-2">
          <Button loading={passwordMutation.isPending} onClick={() => passwordMutation.mutate()}>
            <Lock size={16} className="mr-2" /> Ubah Password
          </Button>
        </div>
      </div>
    </Card>
  )
}

function FaceTab({ employeeId, employeeName }: { employeeId: number; employeeName: string }) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { user, setUser } = useAuthStore()
  const [modelsReady, setModelsReady] = useState(false)
  const [modelsLoading, setModelsLoading] = useState(true)
  const [showCamera, setShowCamera] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)
  const [capturedDescriptor, setCapturedDescriptor] = useState<number[] | null>(null)
  const [detectScore, setDetectScore] = useState<number | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; face: FaceDataset | null }>({ open: false, face: null })
  const face = useFaceRecognition()

  useEffect(() => {
    loadModels().then((ok) => {
      setModelsReady(ok)
      setModelsLoading(false)
    })
  }, [])

  const { data: facesData } = useQuery({
    queryKey: ['face-history', employeeId],
    queryFn: () => faceService.getHistory(employeeId),
    staleTime: 10000,
  })

  const faces: any[] = (facesData as any)?.items ?? (facesData as any)?.data ?? (Array.isArray(facesData) ? facesData : [])

  const registerMutation = useMutation({
    mutationFn: ({ descriptor, image }: { descriptor: number[]; image?: File }) =>
      faceService.register(employeeId, descriptor, image),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-history', employeeId] })
      toast.success('Wajah berhasil didaftarkan!')
      cleanup()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mendaftarkan wajah')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => faceService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['face-history', employeeId] })
      toast.success('Face dataset berhasil dihapus')
      setDeleteModal({ open: false, face: null })
    },
    onError: () => toast.error('Gagal menghapus face dataset'),
  })

  const avatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('photo', file)
      const { data } = await api.put<ApiResponse<any>>('/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return data.data
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['profile-full'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Foto profil berhasil diperbarui')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui foto profil'),
  })

  const cleanup = () => {
    setPreviewUrl(null)
    setPendingImage(null)
    setCapturedDescriptor(null)
    setDetectScore(null)
    setDetecting(false)
    setShowCamera(false)
    face.stopDetection()
    face.stopCamera()
  }

  const handleStartCamera = async () => {
    cleanup()
    setShowCamera(true)
    await new Promise(r => setTimeout(r, 50))
    const ok = await face.startCamera()
    if (!ok) {
      toast.error(face.error || 'Gagal mengakses kamera')
      setShowCamera(false)
      return
    }
    face.startDetection()
  }

  const handleCapture = useCallback(async () => {
    setDetecting(true)
    const result = await face.captureFace()
    if (!result.detected || !result.descriptor) {
      setDetecting(false)
      toast.error('Wajah tidak terdeteksi. Posisikan wajah tepat di tengah layar.')
      return
    }
    const imageFile = await face.captureImage()
    face.stopDetection()
    setDetectScore(result.score ?? 0)

    if (imageFile) {
      setCapturedDescriptor(Array.from(result.descriptor))
      setPendingImage(imageFile)
      setPreviewUrl(URL.createObjectURL(imageFile))
    } else {
      setDetecting(false)
      toast.error('Gagal mengambil gambar')
    }
  }, [face])

  const handleRegisterCamera = useCallback(() => {
    if (!pendingImage || !capturedDescriptor) return
    registerMutation.mutate({ descriptor: capturedDescriptor, image: pendingImage })
  }, [pendingImage, capturedDescriptor, registerMutation])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setShowCamera(false)
    face.stopCamera()
    face.stopDetection()
    setCapturedDescriptor(null)
    setDetectScore(null)
    setPendingImage(file)
    setPreviewUrl(URL.createObjectURL(file))
    e.target.value = ''
  }, [face])

  const handleUploadSubmit = useCallback(async () => {
    if (!pendingImage || !previewUrl) return
    const img = document.createElement('img')
    img.src = previewUrl
    await new Promise((resolve) => { img.onload = resolve })

    const detection = await face.detectFromImage(img)

    if (!detection.detected || !detection.descriptor) {
      toast.error('Tidak ada wajah terdeteksi di foto. Pilih foto dengan wajah yang jelas.')
      return
    }

    setDetectScore(detection.score ?? 0)
    const arr = Array.from(detection.descriptor)
    registerMutation.mutate({ descriptor: arr, image: pendingImage })
  }, [pendingImage, previewUrl, registerMutation, face])

  const handleSetAvatar = useCallback(() => {
    if (!pendingImage) return
    avatarMutation.mutate(pendingImage)
  }, [pendingImage, avatarMutation])

  const handleStopCamera = () => {
    cleanup()
  }

  const handleCancelPreview = () => {
    setPreviewUrl(null)
    setPendingImage(null)
    setCapturedDescriptor(null)
    setDetectScore(null)
    setDetecting(false)
    if (showCamera) {
      face.startDetection()
    }
  }

  return (
    <div className="space-y-4">
      {/* Avatar upload */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative group">
            {user?.employee?.photo ? (
              <img src={user.employee.photo} alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-sky-200" />
            ) : (
              <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <button onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={20} className="text-white" />
            </button>
          </div>
          <div>
            <p className="font-semibold text-gray-900">{employeeName}</p>
            <p className="text-sm text-gray-500">
              {faces.length > 0 ? `${faces.length} foto wajah terdaftar` : 'Belum ada foto wajah'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Klik foto untuk mengubah avatar profil</p>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) avatarMutation.mutate(file)
              e.target.value = ''
            }} />
        </div>
      </Card>

      {/* Face registration actions */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={handleStartCamera} disabled={!modelsReady || showCamera}>
            <Camera size={16} className="mr-1.5" />
            {showCamera ? 'Kamera Aktif' : 'Buka Kamera'}
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!modelsReady}>
            <Upload size={16} className="mr-1.5" />
            Upload Foto Wajah
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
        </div>
      </Card>

      {/* Models loading */}
      {modelsLoading && (
        <Card className="p-4">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-sky-500 border-t-transparent" />
            Memuat model face recognition...
          </div>
        </Card>
      )}

      {!modelsLoading && !modelsReady && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-600">Gagal memuat model face recognition. Refresh halaman untuk mencoba lagi.</p>
        </Card>
      )}

      {face.error && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">{face.error}</p>
              <p className="text-xs text-red-500 mt-1">Pastikan browser memiliki izin akses kamera.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Camera - always render video element, show/hide card */}
      <div className={showCamera && !previewUrl ? '' : 'hidden'}>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Pindai Wajah</h3>
          <div className="relative rounded-xl overflow-hidden bg-black mx-auto" style={{ maxWidth: 480 }}>
            <video ref={face.videoRef} autoPlay playsInline muted className="w-full h-full object-contain" style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={face.canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            {face.faceDetected ? (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-green-500/90 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                <CheckCircle2 size={12} />
                Wajah Terdeteksi ({Math.round(face.faceScore * 100)}%)
              </div>
            ) : (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-500/90 text-white text-xs font-medium px-2.5 py-1 rounded-full backdrop-blur-sm">
                <XCircle size={12} />
                Mencari wajah...
              </div>
            )}
          </div>
          <div className="flex justify-center gap-3 mt-4">
            <Button variant="primary" onClick={handleCapture} disabled={!face.faceDetected || detecting}>
              <ScanFace size={16} className="mr-1.5" />
              {detecting ? 'Memproses...' : 'Ambil Gambar'}
            </Button>
            <Button variant="outline" onClick={handleStopCamera}>
              Tutup Kamera
            </Button>
          </div>
        </Card>
      </div>

      {/* Preview */}
      {previewUrl && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Preview Foto Wajah</h3>
          <div className="flex flex-col items-center gap-3">
            <div className="relative rounded-xl overflow-hidden border-2 border-sky-200 bg-gray-50">
              <img src={previewUrl} alt="Preview wajah" className="max-h-[300px] object-contain" />
              {detectScore !== null && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <p className="text-sm text-white font-medium text-center">
                    Wajah terdeteksi — Skor: {Math.round(detectScore * 100)}%
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">Pastikan wajah terlihat jelas sebelum mendaftarkan</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" onClick={handleCancelPreview}>
                Ulangi
              </Button>
              {capturedDescriptor ? (
                <Button onClick={handleRegisterCamera} loading={registerMutation.isPending}>
                  <CheckCircle2 size={16} className="mr-1.5" /> Daftarkan Wajah
                </Button>
              ) : pendingImage ? (
                <Button onClick={handleUploadSubmit} loading={registerMutation.isPending}>
                  <Upload size={16} className="mr-1.5" /> Daftarkan Wajah
                </Button>
              ) : null}
              <Button variant="outline" onClick={handleSetAvatar} loading={avatarMutation.isPending}>
                <Image size={16} className="mr-1.5" /> Jadikan Avatar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Registered faces */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Wajah Terdaftar ({faces.length})
        </h3>
        {faces.length === 0 ? (
          <div className="text-center py-8">
            <ScanFace size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Belum ada wajah terdaftar</p>
            <p className="text-xs text-gray-400 mt-1">Gunakan kamera atau upload foto untuk mendaftarkan wajah</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {faces.map((faceData: FaceDataset) => (
              <div key={faceData.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                {(faceData as any).image_path ? (
                  <img src={(faceData as any).image_path} alt="Face" className="w-full aspect-square object-cover" />
                ) : (
                  <div className="w-full aspect-square flex items-center justify-center">
                    <ScanFace size={32} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {faceData.is_primary && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500 text-white">Utama</span>
                      )}
                      <span className="text-[10px] text-white/80">
                        {new Date(faceData.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <button
                      onClick={() => setDeleteModal({ open: true, face: faceData })}
                      className="p-1 text-white/60 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

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
