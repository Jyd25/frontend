import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/useAuthStore'

const IDLE_MINUTES = Math.max(1, Number(import.meta.env.VITE_SESSION_TIMEOUT_MINUTES) || 20)
const IDLE_MS = IDLE_MINUTES * 60 * 1000

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove', 'scroll'] as const

export function useSessionTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  const lastActivityRef = useRef(Date.now())

  useEffect(() => {
    if (!isAuthenticated) return

    lastActivityRef.current = Date.now()

    const expire = () => {
      logout()
      toast.info(`Sesi berakhir karena tidak ada aktivitas ${IDLE_MINUTES} menit`, { duration: 3000 })
      navigate('/login', { replace: true })
    }

    const check = () => {
      if (Date.now() - lastActivityRef.current > IDLE_MS) expire()
    }

    const resetActivity = () => {
      lastActivityRef.current = Date.now()
    }

    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, resetActivity, { passive: true }))
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)

    const intervalId = window.setInterval(check, 30_000)

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, resetActivity))
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
      window.clearInterval(intervalId)
    }
  }, [isAuthenticated, logout, navigate])

  return IDLE_MINUTES
}
