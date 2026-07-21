import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { MapPin, Clock, CheckCircle2, LogOut, Camera, CameraOff, Fingerprint, Loader2, AlertTriangle, ChevronRight, CircleDot } from 'lucide-react'
import { attendanceService } from '@/services/attendance.service'
import { faceService, geolocationService } from '@/services/face-geo.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { loadModels, useFaceRecognition, descriptorToArray } from '@/hooks/useFaceRecognition'
import { useAttendanceReminder } from '@/hooks/useAttendanceReminder'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

function formatTime(iso?: string) {
  if (!iso) return '-'
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

function getStatusBadge(status?: string) {
  switch (status) {
    case 'Hadir': return <Badge variant="success">Hadir</Badge>
    case 'Terlambat': return <Badge variant="warning">Terlambat</Badge>
    case 'Alpha': return <Badge variant="danger">Alpha</Badge>
    case 'Izin': return <Badge variant="info">Izin</Badge>
    case 'Sakit': return <Badge variant="warning">Sakit</Badge>
    default: return <Badge>{status || '-'}</Badge>
  }
}

type Step = 'idle' | 'face' | 'submitting' | 'done'

const CHECKIN_DEADLINE_HOUR = 9
const CHECKOUT_DEADLINE_HOUR = 20
const AUTO_CAPTURE_SCORE = 0.75
const CAPTURE_STABLE_MS = 1500

export default function AttendancePage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const employeeId = user?.employee?.id || user?.employee_id

  const [step, setStep] = useState<Step>('idle')
  const [modelsReady, setModelsReady] = useState(false)
  const [faceResult, setFaceResult] = useState<{ matched: boolean; score: number } | null>(null)
  const [geoResult, setGeoResult] = useState<{ inside: boolean; distance: number | null; locationName: string | null } | null>(null)
  const [actionType, setActionType] = useState<'check_in' | 'check_out'>('check_in')
  const [now, setNow] = useState(new Date())
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const faceDetectedSinceRef = useRef<number | null>(null)
  const autoCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const face = useFaceRecognition()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const { data: todayAttendance, isLoading } = useQuery({
    queryKey: ['attendance-today'],
    queryFn: attendanceService.getToday,
    staleTime: 15000,
  })

  const checkInMutation = useMutation({
    mutationFn: (payload: { latitude: number; longitude: number; location_id?: number }) =>
      attendanceService.checkIn(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
      toast.success('Check-in berhasil!')
      setStep('done')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal check-in')
      setStep('idle')
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: attendanceService.checkOut,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] })
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
    try {
      const result = await geolocationService.validate(lat, lng)
      setGeoResult({
        inside: result.inside_radius,
        distance: result.distance,
        locationName: result.location_name,
      })
    } catch {
      setGeoResult({ inside: false, distance: null, locationName: null })
    }
    if (actionType === 'check_in') {
      checkInMutation.mutate({ latitude: lat, longitude: lng })
    } else {
      checkOutMutation.mutate()
    }
    setIsProcessing(false)
  }, [actionType, checkInMutation, checkOutMutation])

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

      toast.info('Memverifikasi wajah...')
    try {
      const verifyResult = await faceService.verify(employeeId!, descriptorToArray(result.descriptor))
      setFaceResult({ matched: verifyResult.matched, score: verifyResult.score })

      if ((verifyResult as any).no_face_data) {
        toast.warning('Data wajah belum terdaftar. Verifikasi dilewati. Silakan daftarkan wajah di menu Update Wajah.', { duration: 6000 })
      } else if (!verifyResult.matched) {
        toast.error(`Wajah tidak cocok (skor: ${verifyResult.score}%)`)
        face.stopCamera()
        setStep('idle')
        setIsProcessing(false)
        return
      }

      toast.success('Verifikasi wajah selesai! Mengambil lokasi...')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Gagal memverifikasi wajah')
      face.stopCamera()
      setStep('idle')
      setIsProcessing(false)
      return
    }

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

  // Auto-capture: when face is detected with high score for long enough, auto-capture
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
    faceDetectedSinceRef.current = null
    if (autoCaptureTimerRef.current) clearTimeout(autoCaptureTimerRef.current)
  }

  const isCheckedIn = todayAttendance && todayAttendance.check_in_time
  const isCheckedOut = todayAttendance && todayAttendance.check_out_time

  useAttendanceReminder({
    enabled: true,
    hasCheckedIn: !!isCheckedIn,
    hasCheckedOut: !!isCheckedOut,
  })

  const currentHour = now.getHours()
  const isPastCheckinDeadline = currentHour >= CHECKIN_DEADLINE_HOUR && !isCheckedIn
  const isPastCheckoutDeadline = currentHour >= CHECKOUT_DEADLINE_HOUR && isCheckedIn && !isCheckedOut

  const checkoutDeadline = new Date(now)
  checkoutDeadline.setHours(CHECKOUT_DEADLINE_HOUR, 0, 0, 0)
  const msUntilCheckout = checkoutDeadline.getTime() - now.getTime()
  const hoursLeft = Math.max(0, Math.floor(msUntilCheckout / 3600000))
  const minsLeft = Math.max(0, Math.floor((msUntilCheckout % 3600000) / 60000))
  const secsLeft = Math.max(0, Math.floor((msUntilCheckout % 60000) / 1000))

  const hours = now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false })
  const minutes = now.toLocaleTimeString('id-ID', { minute: '2-digit' })
  const seconds = now.toLocaleTimeString('id-ID', { second: '2-digit' })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-200 border-t-teal-600" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="gradient-primary rounded-2xl px-8 py-6 text-center shadow-lg shadow-sky-500/15">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Kehadiran</h1>
        <p className="text-sm text-white/60 mt-1">Check-in dan check-out harian</p>
        <div className="mt-4">
          <div className="inline-flex items-baseline gap-1 tabular-nums font-mono tracking-tighter">
            <span className="text-4xl sm:text-5xl font-semibold text-white">{hours}</span>
            <span className="text-xl font-light text-white/70 animate-pulse">:</span>
            <span className="text-4xl sm:text-5xl font-semibold text-white">{minutes}</span>
            <span className="text-xl font-light text-white/40">:</span>
            <span className="text-4xl sm:text-5xl font-normal text-white/50">{seconds}</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-medium text-white/70 uppercase tracking-wider">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 !p-0 overflow-hidden">
          <div className="p-8 sm:p-10 text-center">
            {/* IDLE */}
            {step === 'idle' && (
              <>
                <div className="mb-6">
                  {isCheckedIn ? (
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 ring-1 ring-emerald-500/10">
                      <CheckCircle2 size={40} className="text-emerald-600" />
                    </div>
                  ) : (
                    <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ring-1 ${
                      isPastCheckinDeadline
                        ? 'bg-amber-50 ring-amber-500/10'
                        : 'bg-gray-100 ring-gray-200'
                    }`}>
                      {isPastCheckinDeadline
                        ? <AlertTriangle size={40} className="text-amber-600" />
                        : <Clock size={40} className="text-gray-400" />
                      }
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  {isCheckedIn
                    ? isCheckedOut
                      ? 'Kehadiran Selesai'
                      : 'Sudah Check-In'
                    : isPastCheckinDeadline
                      ? 'Terlambat Hari Ini'
                      : 'Belum Check-In'
                  }
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  {isCheckedIn
                    ? isCheckedOut
                      ? 'Anda sudah melakukan check-in dan check-out hari ini'
                      : 'Menunggu waktu check-out'
                    : isPastCheckinDeadline
                      ? 'Batas check-in 09:00 sudah lewat. Anda masih bisa check-in dengan status terlambat.'
                      : 'Lakukan check-in untuk memulai hari kerja'
                  }
                </p>

                {isPastCheckinDeadline && !isCheckedIn && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-lg p-3 mb-6 max-w-sm mx-auto text-left">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Batas check-in 09:00 sudah lewat</p>
                        <p className="text-xs text-amber-600/80 mt-0.5">Status akan tercatat sebagai <strong>Terlambat</strong>.</p>
                      </div>
                    </div>
                  </div>
                )}

                {isPastCheckoutDeadline && (
                  <div className="bg-red-50 border border-red-200/60 rounded-lg p-3 mb-6 max-w-sm mx-auto text-left">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Batas check-out 20:00 sudah lewat</p>
                        <p className="text-xs text-red-600/80 mt-0.5">Segera check-out untuk menghindari status Alpha.</p>
                      </div>
                    </div>
                  </div>
                )}

                {isCheckedIn && todayAttendance && (
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>Masuk {formatTime(todayAttendance.check_in_time)}</span>
                    </div>
                    {getStatusBadge(todayAttendance.attendance_status)}
                  </div>
                )}

                {cameraError && (
                  <div className="bg-red-50 border border-red-200/60 rounded-lg p-3 mb-6 max-w-sm mx-auto text-left">
                    <div className="flex items-start gap-2">
                      <CameraOff size={15} className="text-red-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-800">{cameraError}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {!isCheckedIn && modelsReady && (
                    <Button size="lg" onClick={() => startAttendance('check_in')} className="w-full sm:w-auto min-w-[200px]">
                      <Fingerprint size={18} className="mr-2" /> Check In
                    </Button>
                  )}
                  {!isCheckedIn && !modelsReady && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" /> Memuat model wajah...
                    </div>
                  )}
                  {isCheckedIn && !isCheckedOut && modelsReady && (
                    <Button size="lg" variant="danger" onClick={() => startAttendance('check_out')} className="w-full sm:w-auto min-w-[200px]">
                      <LogOut size={18} className="mr-2" /> Check Out
                    </Button>
                  )}
                  {isCheckedIn && !isCheckedOut && !modelsReady && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Loader2 size={14} className="animate-spin" /> Memuat model wajah...
                    </div>
                  )}
                  {isCheckedOut && (
                    <div className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                      <CheckCircle2 size={16} />
                      Check-out pukul {formatTime(todayAttendance.check_out_time)}
                    </div>
                  )}
                  {!isCheckedIn && !isCheckedOut && isPastCheckinDeadline && (
                    <Link to="/corrections" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mt-2 group">
                      <AlertTriangle size={13} />
                      Lupa absen? Ajukan perbaikan
                      <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* FACE CAMERA + AUTO CAPTURE */}
            {step === 'face' && (
              <>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">
                    {actionType === 'check_in' ? 'Check-In' : 'Check-Out'} — Verifikasi Wajah
                  </h2>
                  <p className="text-sm text-gray-500">
                    {isProcessing
                      ? 'Memproses verifikasi...'
                      : countdown !== null
                        ? 'Wajah terdeteksi! Tunggu sebentar...'
                        : 'Arahkan wajah ke kamera'
                    }
                  </p>
                </div>

                <div className="relative inline-block rounded-xl overflow-hidden border-2 border-sky-300 mb-5 w-full max-w-sm shadow-lg shadow-sky-500/10">
                    <video ref={face.videoRef} autoPlay muted playsInline className="w-full aspect-[4/3] object-cover" style={{ transform: 'scaleX(-1)' }} />
                    <canvas ref={face.canvasRef} className="absolute inset-0 w-full h-full" style={{ transform: 'scaleX(-1)' }} />

                  {/* Status badge */}
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

                  {/* Countdown overlay */}
                  {countdown !== null && countdown > 0 && !isProcessing && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                      <div className="bg-black/60 text-white px-3 py-1.5 rounded-full text-sm font-mono font-bold backdrop-blur-sm">
                        {countdown}s
                      </div>
                    </div>
                  )}

                  {/* Scanning line effect when searching */}
                  {face.isReady && !face.faceDetected && !isProcessing && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute left-0 right-0 h-0.5 bg-sky-400/60 animate-[scan_2s_ease-in-out_infinite]" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button
                    onClick={doCaptureAndVerify}
                    disabled={isProcessing || !face.faceDetected}
                    loading={isProcessing}
                    className="w-full sm:w-auto min-w-[180px]"
                  >
                    <Camera size={15} className="mr-2" /> Ambil & Verifikasi
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={isProcessing} className="w-full sm:w-auto">
                    <CameraOff size={15} className="mr-2" /> Batal
                  </Button>
                </div>
              </>
            )}

            {/* SUBMITTING */}
            {step === 'submitting' && (
              <>
                <div className="mb-5">
                  <Loader2 size={40} className="mx-auto text-sky-500 animate-spin" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Memproses Kehadiran...</h2>
                <div className="flex flex-wrap justify-center gap-2">
                  {faceResult && (
                    faceResult.matched
                      ? <Badge variant="success">Wajah Cocok ({faceResult.score}%)</Badge>
                      : <Badge variant="danger">Wajah Tidak Cocok</Badge>
                  )}
                  {geoResult && (
                    geoResult.inside
                      ? <Badge variant="success"><MapPin size={12} className="mr-1" />{geoResult.locationName} ({geoResult.distance}m)</Badge>
                      : <Badge variant="warning"><MapPin size={12} className="mr-1" />{geoResult.distance !== null ? `${geoResult.distance}m dari ${geoResult.locationName}` : 'Di luar radius'}</Badge>
                  )}
                </div>
              </>
            )}

            {/* DONE */}
            {step === 'done' && (
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 ring-1 ring-emerald-500/10 mb-5">
                  <CheckCircle2 size={40} className="text-emerald-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  {actionType === 'check_in' ? 'Check-In Berhasil!' : 'Check-Out Berhasil!'}
                </h2>
                <div className="flex justify-center gap-2 flex-wrap mb-6">
                  {faceResult?.matched && <Badge variant="success">Wajah Cocok</Badge>}
                  {geoResult?.inside && <Badge variant="success">{geoResult.locationName}</Badge>}
                </div>
                <Button variant="outline" onClick={() => { setStep('idle'); queryClient.invalidateQueries({ queryKey: ['attendance-today'] }) }}>
                  Tutup
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {isCheckedIn && !isCheckedOut && (
            <div className={`rounded-xl p-5 text-white ${
              msUntilCheckout <= 0
                ? 'bg-red-600'
                : msUntilCheckout < 3600000
                  ? 'bg-amber-500'
                  : 'gradient-primary'
            }`}>
              <p className="text-xs font-medium opacity-70 mb-1">Sisa Waktu Check-Out</p>
              <div className="flex items-baseline gap-1 tabular-nums font-mono">
                <span className="text-3xl font-bold">{String(hoursLeft).padStart(2, '0')}</span>
                <span className="text-lg opacity-50">:</span>
                <span className="text-3xl font-bold">{String(minsLeft).padStart(2, '0')}</span>
                <span className="text-lg opacity-50">:</span>
                <span className="text-3xl font-bold">{String(secsLeft).padStart(2, '0')}</span>
              </div>
              <p className="text-xs mt-1.5 opacity-60">Batas: 20:00 WIB</p>
            </div>
          )}

          <Card title="Hari Ini">
            {todayAttendance ? (
              <div className="space-y-0 divide-y divide-gray-100">
                {[
                  { icon: Clock, label: 'Jam Masuk', value: formatTime(todayAttendance.check_in_time), color: 'text-sky-500' },
                  { icon: Clock, label: 'Jam Pulang', value: formatTime(todayAttendance.check_out_time), color: 'text-orange-500' },
                  { icon: MapPin, label: 'Lokasi', value: todayAttendance.location_status || '-', color: 'text-emerald-500' },
                  { icon: Fingerprint, label: 'Verifikasi', value: todayAttendance.face_status || '-', color: 'text-purple-500' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="p-1.5 rounded-md bg-gray-100">
                      <item.icon size={14} className={item.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                      <p className="text-sm font-medium text-gray-700 truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-3">
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
                  {getStatusBadge(todayAttendance.attendance_status)}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">Belum ada data hari ini</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
