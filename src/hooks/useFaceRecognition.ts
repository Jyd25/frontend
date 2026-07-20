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
  const detectingRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  const startCamera = useCallback(async (): Promise<boolean> => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: isMobile ? 320 : 480 },
          height: { ideal: isMobile ? 240 : 360 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
        return true
      }
      return false
    } catch {
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
        // ignore
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
    startCamera,
    stopCamera,
    startDetection,
    stopDetection,
    captureFace,
  }
}

export function descriptorToArray(desc: Float32Array): number[] {
  return Array.from(desc)
}
