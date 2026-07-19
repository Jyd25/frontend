import { useRef, useState, useCallback, useEffect } from 'react'
import * as faceapi from '@vladmandic/face-api'

const MODEL_URL = '/models'
let modelsLoaded = false

export async function loadModels() {
  if (modelsLoaded) return true
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
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
  const [isReady, setIsReady] = useState(false)
  const [isDetecting, setIsDetecting] = useState(false)
  const [faceDetected, setFaceDetected] = useState(false)
  const [descriptor, setDescriptor] = useState<Float32Array | null>(null)
  const detectionInterval = useRef<ReturnType<typeof setInterval>>(undefined)

  const startCamera = useCallback(async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 480 : 640 },
          height: { ideal: isMobile ? 360 : 480 },
          facingMode: 'user',
        },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
      }
    } catch {
      return false
    }
    return true
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
    if (detectionInterval.current) clearInterval(detectionInterval.current)
    setIsReady(false)
    setIsDetecting(false)
    setFaceDetected(false)
    setDescriptor(null)
  }, [])

  const detectFace = useCallback(async (): Promise<{ detected: boolean; descriptor?: Float32Array; score?: number }> => {
    if (!videoRef.current || !isReady) return { detected: false }

    const video = videoRef.current
    if (video.readyState !== 4) return { detected: false }

    const detection = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
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
      setDescriptor(detection.descriptor)
      return { detected: true, descriptor: detection.descriptor, score: detection.detection.score }
    }

    setFaceDetected(false)
    setDescriptor(null)
    return { detected: false }
  }, [isReady])

  const startDetection = useCallback(() => {
    if (detectionInterval.current) clearInterval(detectionInterval.current)
    setIsDetecting(true)
    detectionInterval.current = setInterval(detectFace, 500)
  }, [detectFace])

  const stopDetection = useCallback(() => {
    if (detectionInterval.current) clearInterval(detectionInterval.current)
    setIsDetecting(false)
  }, [])

  useEffect(() => {
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current)
    }
  }, [])

  return {
    videoRef,
    canvasRef,
    isReady,
    isDetecting,
    faceDetected,
    descriptor,
    startCamera,
    stopCamera,
    detectFace,
    startDetection,
    stopDetection,
  }
}

export function descriptorToArray(desc: Float32Array): number[] {
  return Array.from(desc)
}
