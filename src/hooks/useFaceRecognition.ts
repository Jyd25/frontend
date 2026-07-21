import { useRef, useState, useCallback, useEffect } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = '/models'
let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return true
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ])
    modelsLoaded = true
    return true
  } catch {
    return false
  }
}

export function useFaceRecognition() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [faceScore, setFaceScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const detectingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const startCamera = useCallback(async (): Promise<boolean> => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        await video.play()
        setIsReady(true)
        return true
      }
      stream.getTracks().forEach((t) => t.stop())
      return false
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Izin kamera ditolak. Berikan izin akses kamera di browser.'
        : err?.name === 'NotFoundError'
        ? 'Tidak ada kamera yang ditemukan.'
        : err?.name === 'NotReadableError'
        ? 'Kamera sedang digunakan aplikasi lain.'
        : 'Gagal mengakses kamera.'
      setError(msg)
      return false
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    detectingRef.current = false
    if (timerRef.current) clearInterval(timerRef.current)
    setIsReady(false)
    setFaceDetected(false)
    setFaceScore(0)
  }, [])

  const startDetection = useCallback(() => {
    if (detectingRef.current) return
    detectingRef.current = true

    timerRef.current = setInterval(async () => {
      const video = videoRef.current
      if (!video || video.readyState !== 4 || !detectingRef.current) return

      try {
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (canvasRef.current) {
          const canvas = canvasRef.current
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          const ctx = canvas.getContext('2d')
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            if (detection) {
              const dims = faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight }, true)
              const resized = faceapi.resizeResults(detection, dims)
              faceapi.draw.drawDetections(canvas, resized)
            }
          }
        }

        if (detection) {
          setFaceDetected(true)
          setFaceScore(detection.detection.score)
        } else {
          setFaceDetected(false)
          setFaceScore(0)
        }
      } catch {
        // ignore detection errors during streaming
      }
    }, 600)
  }, [])

  const stopDetection = useCallback(() => {
    detectingRef.current = false
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const captureFace = useCallback(async (): Promise<{ detected: boolean; descriptor?: Float32Array; score?: number }> => {
    const video = videoRef.current
    if (!video || video.readyState !== 4) return { detected: false }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor()

    if (detection) {
      return { detected: true, descriptor: detection.descriptor, score: detection.detection.score }
    }
    return { detected: false }
  }, [])

  const captureImage = useCallback(async (): Promise<File | null> => {
    const video = videoRef.current
    if (!video || video.readyState !== 4) return null

    const c = document.createElement('canvas')
    c.width = video.videoWidth
    c.height = video.videoHeight
    const ctx = c.getContext('2d')
    if (!ctx) return null

    ctx.translate(c.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, c.width, c.height)

    return new Promise<File | null>((resolve) => {
      c.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'face-capture.jpg', { type: 'image/jpeg', lastModified: Date.now() }))
        } else {
          resolve(null)
        }
      }, 'image/jpeg', 0.92)
    })
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    isReady,
    faceDetected,
    faceScore,
    error,
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    captureFace,
    captureImage,
  }
}

export function descriptorToArray(desc: Float32Array): number[] {
  return Array.from(desc)
}
