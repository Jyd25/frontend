import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { MapPin, Clock, CheckCircle2, LogOut, Camera, CameraOff, Fingerprint, Loader2, AlertTriangle, CircleDot, Navigation } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { faceService, geolocationService } from '@/services/face-geo.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { loadModels, useFaceRecognition, descriptorToArray } from '@/hooks/useFaceRecognition'
import { reverseGeocode } from '@/lib/geocode'
import LocationMap from '@/components/ui/LocationMap'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

function formatTime(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

type Step = 'idle' | 'face' | 'submitting' | 'done'

const AUTO_CAPTURE_SCORE = 0.75
const CAPTURE_STABLE_MS = 1500

interface Props {
  open: boolean
  onClose: () => void
  todayAttendance: any
}

export default function PresensiModal({ open, onClose, todayAttendance }: Props) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const employeeId = user?.employee?.id || user?.employee_id

  const [step, setStep] = useState<Step>('idle')
  const [modelsReady, setModelsReady] = useState(false)
  const [faceResult, setFaceResult] = useState<{ matched: boolean; score: number } | null>(null)
  const [geoResult, setGeoResult] = useState<{ inside: boolean; distance: number | null; locationName: string | null; locationId: number | null; latitude: number | null; longitude: number | null; address: string | null; locationLat: number | null; locationLng: number | null; radius: number | null } | null>(null)
  const [actionType, setActionType] = useState<'check_in' | 'check_out'>('check_in')
  const [now, setNow] = useState(new Date())
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [capturedFacePhoto, setCapturedFacePhoto] = useState<string | null>(null)

  const faceDetectedSinceRef = useRef<number | null>(null)
  const autoCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const face = useFaceRecognition()

  useEffect(() => {
    if (!open) {
      setStep('idle')
      setFaceResult(null)
      setGeoResult(null)
      setCameraError(null)
      setCountdown(null)
      setCapturedFacePhoto(null)
      faceDetectedSinceRef.current = null
      if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current)
      face.stopCamera()
      face.stopDetection()
    }
  }, [open, face])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const checkInMutation = useMutation({
    mutationFn: (payload: { latitude: number; longitude: number; location_id?: number; face_score?: number; face_status?: string; photo_data?: string; address?: string }) =>
      attendanceService.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      queryClient.invalidateQueries({ queryKey: ['attendances-monthly'] })
      toast.success('Check-in berhasil!')
      setStep('done')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal check-in')
      setStep('idle')
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: (payload: { face_score?: number; face_status?: string; photo_data?: string; latitude?: number; longitude?: number; location_id?: number; address?: string }) =>
      attendanceService.checkOut(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      queryClient.invalidateQueries({ queryKey: ['attendances-monthly'] })
      toast.success('Check-out berhasil!')
      setStep('done')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal check-out')
      setStep('idle')
    },
  })

  useEffect(() => {
    loadModels().then((ok) => setModelsReady(ok))
  }, [])

  const processGeo = useCallback(async (lat: number, lng: number) => {
    setStep('submitting')
    setIsProcessing(true)
    let locationId: number | null = null
    let address: string | null = null
    let locLat: number | null = null
    let locLng: number | null = null
    let locRadius: number | null = null
    try {
      const [result, geoAddr] = await Promise.all([
        geolocationService.validate(lat, lng),
        reverseGeocode(lat, lng),
      ])
      locationId = result.location_id ?? null
      address = geoAddr
      locLat = result.latitude
      locLng = result.longitude
      locRadius = result.radius
      setGeoResult({
        inside: result.inside_radius,
        distance: result.distance,
        locationName: result.location_name,
        locationId,
        latitude: result.latitude,
        longitude: result.longitude,
        address,
        locationLat: locLat,
        locationLng: locLng,
        radius: locRadius,
      })
    } catch {
      try {
        address = await reverseGeocode(lat, lng)
      } catch {}
      setGeoResult({ inside: false, distance: null, locationName: null, locationId: null, latitude: null, longitude: null, address, locationLat: null, locationLng: null, radius: null })
    }

    const facePayload = {
      face_score: faceResult?.score,
      face_status: faceResult?.matched ? 'matched' : 'unmatched',
      photo_data: capturedFacePhoto || undefined,
    }

    if (actionType === 'check_in') {
      checkInMutation.mutate({
        latitude: lat,
        longitude: lng,
        location_id: locationId ?? undefined,
        ...facePayload,
        address: address || undefined,
      })
    } else {
      checkOutMutation.mutate({
        ...facePayload,
        latitude: lat,
        longitude: lng,
        location_id: locationId ?? undefined,
        address: address || undefined,
      })
    }
    setIsProcessing(false)
  }, [actionType, checkInMutation, checkOutMutation, faceResult, capturedFacePhoto])

  const doCaptureAndVerify = useCallback(async () => {
    if (isProcessing) return
    setIsProcessing(true)
    face.stopDetection()

    toast.info('Mengambil gambar wajah...')
    const result = await face.captureFace()
    if (!result.detected || !result.descriptor) {
      toast.error('Wajah tidak terdeteksi. Coba lagi.')
      face.startDetection()
      setIsProcessing(false)
      return
    }

    toast.info('Menyimpan gambar wajah...')
    const imageFile = await face.captureImage()
    let imageDataUri: string | null = null
    if (imageFile) {
      imageDataUri = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(imageFile)
      })
    }
    setCapturedFacePhoto(imageDataUri)

    toast.info('Memverifikasi wajah...')
    try {
      const verifyResult = await faceService.verify(employeeId!, descriptorToArray(result.descriptor))
      setFaceResult({ matched: verifyResult.matched, score: verifyResult.score })

      if ((verifyResult as any).no_face_data) {
        toast.warning('Data wajah belum terdaftar. Verifikasi dilewati.', { duration: 6000 })
      } else if (!verifyResult.matched) {
        toast.warning(`Wajah tidak cocok (skor: ${verifyResult.score}%). Presensi tetap dilanjutkan.`, { duration: 5000 })
      } else {
        toast.success('Wajah cocok! Melanjutkan...')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memverifikasi wajah')
      setFaceResult({ matched: false, score: 0 })
    }

    toast.info('Mengambil lokasi...')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        face.stopCamera()
        await processGeo(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        toast.error('Gagal mendapatkan lokasi. GPS aktif?')
        face.stopCamera()
        setStep('idle')
        setIsProcessing(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [employeeId, face, processGeo, isProcessing])

  async function startAttendance(type: 'check_in' | 'check_out') {
    if (type === 'check_in' && !employeeId) {
      toast.error('Akun ini belum terkait data karyawan. Hubungi admin.', { duration: 5000 })
      return
    }
    setActionType(type)
    setFaceResult(null)
    setGeoResult(null)
    setCameraError(null)
    setCountdown(null)
    setCapturedFacePhoto(null)
    faceDetectedSinceRef.current = null
    setStep('face')

    const ok = await face.startCamera()
    if (!ok) {
      toast.error('Gagal membuka kamera. Pastikan izin kamera diberikan.')
      setCameraError('Kamera tidak tersedia. Berikan izin kamera di browser.')
      setStep('idle')
      return
    }
  }

  useEffect(() => {
    if (step === 'face' && face.isReady && !isProcessing) {
      face.startDetection()
    }
    return () => {
      if (step !== 'face') face.stopDetection()
    }
  }, [step, face.isReady, face, isProcessing])

  useEffect(() => {
    if (step !== 'face' || isProcessing) return

    if (face.faceDetected && face.faceScore >= AUTO_CAPTURE_SCORE) {
      if (!faceDetectedSinceRef.current) {
        faceDetectedSinceRef.current = Date.now()
        setCountdown(Math.ceil(CAPTURE_STABLE_MS / 1000))
      }

      const elapsed = Date.now() - faceDetectedSinceRef.current
      const remaining = Math.max(0, CAPTURE_STABLE_MS - elapsed)
      setCountdown(Math.ceil(remaining / 1000))

      if (remaining <= 0) {
        faceDetectedSinceRef.current = null
        setCountdown(null)
        doCaptureAndVerify()
        return
      }

      autoCaptureTimerRef.current = setTimeout(() => {
        const newRemaining = Math.max(0, CAPTURE_STABLE_MS - (Date.now() - (faceDetectedSinceRef.current || Date.now())))
        setCountdown(Math.ceil(newRemaining / 1000))
      }, 100)
    } else {
      faceDetectedSinceRef.current = null
      setCountdown(null)
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current)
      }
    }

    return () => {
      if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current)
    }
  }, [face.faceDetected, face.faceScore, step, isProcessing, doCaptureAndVerify])

  function handleCancel() {
    face.stopCamera()
    face.stopDetection()
    setStep('idle')
    setFaceResult(null)
    setGeoResult(null)
    setCameraError(null)
    setCountdown(null)
    setCapturedFacePhoto(null)
    faceDetectedSinceRef.current = null
    if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current)
  }

  const isCheckedIn = todayAttendance && todayAttendance.check_in_time
  const isCheckedOut = todayAttendance && todayAttendance.check_out_time

  const currentHour = now.getHours()
  const currentMinute = now.getHours() * 60 + now.getMinutes()
  const presensiDeadlineMinute = 10 * 60

  const isPastDeadline = currentMinute >= presensiDeadlineMinute

  const showCheckIn = !isCheckedIn && !isCheckedOut && !isPastDeadline
  const showCheckOutLate = !isCheckedIn && !isCheckedOut && isPastDeadline
  const showCheckOutNormal = isCheckedIn && !isCheckedOut
  const showDone = isCheckedOut

  if (!open) return null

  const doneTitle = actionType === 'check_in' ? 'Check-In Berhasil!' : 'Check-Out Berhasil!'

  return (
    <Modal open={open} onClose={() => { handleCancel(); onClose() }} title={
      step === 'idle' ? 'Presensi Hari Ini' : step === 'done' ? doneTitle : undefined
    }>
      {/* IDLE */}
      {step === 'idle' && (
        <div className="text-center space-y-4">
          <div className="mb-2">
            {showDone ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 ring-1 ring-emerald-500/10">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
            ) : showCheckOutLate ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 ring-1 ring-amber-500/10">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
            ) : showCheckOutNormal ? (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-sky-50 ring-1 ring-sky-500/10">
                <LogOut size={32} className="text-sky-600" />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 ring-1 ring-gray-200">
                <Clock size={32} className="text-gray-400" />
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {showDone
              ? 'Anda sudah check-in dan check-out hari ini.'
              : showCheckOutNormal
                ? 'Check-in sudah tercatat. Silakan lakukan check-out.'
                : showCheckOutLate
                  ? 'Lewat pukul 10:00. Silakan lakukan check-out.'
                  : 'Lakukan check-in untuk memulai hari kerja.'}
          </p>
          {showCheckOutNormal && todayAttendance && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Clock size={14} />
              <span>Masuk {formatTime(todayAttendance.check_in_time)}</span>
            </div>
          )}
          {cameraError && (
            <div className="bg-red-50 border border-red-200/60 rounded-lg p-3 text-left">
              <div className="flex items-start gap-2">
                <CameraOff size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{cameraError}</p>
              </div>
            </div>
          )}
          <div className="space-y-3">
            {showCheckIn && modelsReady && (
              <Button size="lg" onClick={() => startAttendance('check_in')} className="w-full min-w-[200px]">
                <Fingerprint size={18} className="mr-2" /> Check In
              </Button>
            )}
            {showCheckIn && !modelsReady && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Memuat model wajah...
              </div>
            )}
            {showCheckOutLate && modelsReady && (
              <Button size="lg" variant="danger" onClick={() => startAttendance('check_out')} className="w-full min-w-[200px]">
                <LogOut size={18} className="mr-2" /> Check Out
              </Button>
            )}
            {showCheckOutLate && !modelsReady && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Memuat model wajah...
              </div>
            )}
            {showCheckOutNormal && modelsReady && (
              <Button size="lg" variant="danger" onClick={() => startAttendance('check_out')} className="w-full min-w-[200px]">
                <LogOut size={18} className="mr-2" /> Check Out
              </Button>
            )}
            {showCheckOutNormal && !modelsReady && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Loader2 size={14} className="animate-spin" /> Memuat model wajah...
              </div>
            )}
            {showDone && (
              <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                Check-out pukul {formatTime(todayAttendance.check_out_time)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* FACE CAMERA */}
      {step === 'face' && (
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-500">
            {isProcessing ? 'Memproses verifikasi...' : countdown !== null ? 'Wajah terdeteksi! Tunggu sebentar...' : `Arahkan wajah ke kamera${actionType === 'check_out' ? ' (Check Out)' : ''}`}
          </p>
          <div className="relative inline-block rounded-xl overflow-hidden border-2 border-sky-300 w-full max-w-sm shadow-lg shadow-sky-500/10">
            <video ref={face.videoRef} autoPlay muted playsInline className="w-full aspect-[4/3] object-cover" style={{ transform: 'scaleX(-1)' }} />
            <canvas ref={face.canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />
            {isProcessing ? (
              <div className="absolute top-3 right-3 bg-sky-600 text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                <Loader2 size={12} className="animate-spin" /> Proses
              </div>
            ) : face.faceDetected && face.faceScore >= AUTO_CAPTURE_SCORE ? (
              <div className="absolute top-3 right-3 bg-emerald-600 text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                <CheckCircle2 size={12} /> Terdeteksi
              </div>
            ) : face.isReady ? (
              <div className="absolute top-3 right-3 bg-amber-500 text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                <CircleDot size={12} /> Cari Wajah
              </div>
            ) : (
              <div className="absolute top-3 right-3 bg-gray-600 text-white px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5">
                <Camera size={12} /> Memuat...
              </div>
            )}
            {countdown !== null && countdown > 0 && !isProcessing && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-mono font-bold backdrop-blur-sm">{countdown}s</div>
              </div>
            )}
            {face.isReady && !face.faceDetected && !isProcessing && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute left-0 right-0 h-0.5 bg-sky-400/60 animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button onClick={doCaptureAndVerify} disabled={isProcessing || !face.faceDetected} loading={isProcessing} className="w-full sm:w-auto min-w-[180px]">
              <Camera size={15} className="mr-2" /> Ambil & Verifikasi
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={isProcessing} className="w-full sm:w-auto">
              <CameraOff size={15} className="mr-2" /> Batal
            </Button>
          </div>
        </div>
      )}

      {/* SUBMITTING */}
      {step === 'submitting' && (
        <div className="text-center space-y-4">
          <Loader2 size={36} className="mx-auto text-sky-500 animate-spin" />
          <p className="text-sm font-medium text-gray-700">
            {actionType === 'check_in' ? 'Memproses Check-In...' : 'Memproses Check-Out...'}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {faceResult && (
              faceResult.matched
                ? <Badge variant="success">Wajah Cocok ({faceResult.score}%)</Badge>
                : <Badge variant="danger">Wajah Tidak Cocok</Badge>
            )}
            {geoResult && (
              geoResult.inside
                ? <Badge variant="success"><MapPin size={12} className="mr-1" />{geoResult.locationName} ({geoResult.distance}m)</Badge>
                : <Badge variant="warning"><MapPin size={12} className="mr-1" />Luar Radius — {geoResult.locationName || 'Lokasi'}</Badge>
            )}
          </div>
        </div>
      )}

      {/* DONE */}
      {step === 'done' && (
        <div className="text-center space-y-4">
          {capturedFacePhoto && (
            <div className="inline-block">
              <div className={`relative rounded-xl overflow-hidden border-2 ${faceResult?.matched ? 'border-emerald-400' : 'border-amber-400'}`}>
                <img src={capturedFacePhoto} alt="Hasil Verifikasi" className="w-36 h-36 object-cover" style={{ transform: 'scaleX(-1)' }} />
                <div className={`absolute bottom-0 left-0 right-0 px-2 py-1.5 text-center text-xs font-bold text-white ${faceResult?.matched ? 'bg-emerald-600/90' : 'bg-amber-500/90'}`}>
                  {faceResult?.score ?? 0}% Cocok
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-2 flex-wrap">
            {geoResult?.inside && <Badge variant="success"><MapPin size={12} className="mr-1" />{geoResult.locationName}</Badge>}
            {geoResult && !geoResult.inside && (
              <Badge variant="warning">
                <MapPin size={12} className="mr-1" /> Luar Radius
                <span className="block text-[10px] mt-1 text-gray-600">{geoResult.locationName || 'Lokasi'} ({geoResult.distance !== null ? `${geoResult.distance}m` : ''})</span>
              </Badge>
            )}
          </div>
          {geoResult?.latitude && geoResult?.longitude && (
            <div className="max-w-md mx-auto">
              {geoResult.address && (
                <div className="flex items-start gap-2 text-left bg-gray-50 rounded-lg p-3 mb-3">
                  <Navigation size={14} className="text-sky-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">{geoResult.address}</p>
                </div>
              )}
              {geoResult.locationLat && geoResult.locationLng && geoResult.radius && (
                <LocationMap
                  userLat={geoResult.latitude}
                  userLng={geoResult.longitude}
                  centerLat={geoResult.locationLat}
                  centerLng={geoResult.locationLng}
                  radius={geoResult.radius}
                  locationName={geoResult.locationName || 'Lokasi'}
                />
              )}
            </div>
          )}
          <Button variant="outline" onClick={() => { setStep('idle'); onClose() }} className="w-full">
            Tutup
          </Button>
        </div>
      )}
    </Modal>
  )
}
