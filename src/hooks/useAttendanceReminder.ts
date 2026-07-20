import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

interface ReminderOptions {
  enabled: boolean
  checkInDeadline?: number
  checkOutDeadline?: number
  hasCheckedIn: boolean
  hasCheckedOut: boolean
}

const NOTIFIED_KEY = 'attendance_notified'

function getNotified(): Record<string, boolean> {
  try {
    const raw = sessionStorage.getItem(NOTIFIED_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setNotified(key: string) {
  const data = getNotified()
  data[key] = true
  sessionStorage.setItem(NOTIFIED_KEY, JSON.stringify(data))
}

function showBrowserNotification(title: string, body: string, tag?: string) {
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/logo-school.png',
        tag: tag || 'attendance-reminder',
        requireInteraction: true,
      })
    } catch {
      // silent fail — some browsers block in background
    }
  }
}

export function useAttendanceReminder({
  enabled,
  checkInDeadline = 9,
  checkOutDeadline = 20,
  hasCheckedIn,
  hasCheckedOut,
}: ReminderOptions) {
  const notifiedRef = useRef<Record<string, boolean>>(getNotified())

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    requestPermission()
  }, [enabled, requestPermission])

  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      const now = new Date()
      const h = now.getHours()
      const m = now.getMinutes()
      const timeKey = `${h}:${m}`
      const n = notifiedRef.current

      // Check-in reminders (only if not checked in yet)
      if (!hasCheckedIn) {
        // 5 minutes before deadline
        if (h === checkInDeadline - 1 && m === 55 && !n['ci_5min']) {
          const msg = 'Batas check-in 5 menit lagi. Siap-siap absen!'
          toast.warning(msg, { duration: 10000 })
          showBrowserNotification('Pengingat Check-In', msg, 'ci-5min')
          setNotified('ci_5min')
          notifiedRef.current = { ...getNotified(), ci_5min: true }
        }

        // At deadline
        if (h === checkInDeadline && m === 0 && !n['ci_deadline']) {
          const msg = 'Batas check-in 09:00 sudah lewat! Status akan tercatat Terlambat.'
          toast.error(msg, { duration: 15000 })
          showBrowserNotification('Batas Check-In Lewat!', msg, 'ci-deadline')
          setNotified('ci_deadline')
          notifiedRef.current = { ...getNotified(), ci_deadline: true }
        }

        // Every hour after deadline until checked in
        if (h > checkInDeadline && h <= checkOutDeadline && m === 0 && h !== 12 && !n[`ci_hourly_${h}`]) {
          const msg = `Anda belum check-in hari ini (${h}:00). Segera lakukan kehadiran!`
          toast.warning(msg, { duration: 8000 })
          showBrowserNotification('Belum Check-In', msg, `ci-hourly-${h}`)
          setNotified(`ci_hourly_${h}`)
          notifiedRef.current = { ...getNotified(), [`ci_hourly_${h}`]: true }
        }
      }

      // Check-out reminders (only if checked in but not checked out)
      if (hasCheckedIn && !hasCheckedOut) {
        // 1 hour before checkout deadline
        if (h === checkOutDeadline - 1 && m === 0 && !n['co_1hour']) {
          const msg = '1 jam lagi sebelum batas check-out (20:00). Jangan lupa absen!'
          toast.info(msg, { duration: 10000 })
          showBrowserNotification('Pengingat Check-Out', msg, 'co-1hour')
          setNotified('co_1hour')
          notifiedRef.current = { ...getNotified(), co_1hour: true }
        }

        // 15 minutes before checkout deadline
        if (h === checkOutDeadline - 1 && m === 45 && !n['co_15min']) {
          const msg = '15 menit lagi sebelum batas check-out. Segera check-out!'
          toast.warning(msg, { duration: 10000 })
          showBrowserNotification('Check-Out Segera!', msg, 'co-15min')
          setNotified('co_15min')
          notifiedRef.current = { ...getNotified(), co_15min: true }
        }

        // At checkout deadline
        if (h === checkOutDeadline && m === 0 && !n['co_deadline']) {
          const msg = 'Batas check-out 20:00 sudah lewat! Segera check-out!'
          toast.error(msg, { duration: 15000 })
          showBrowserNotification('Batas Check-Out Lewat!', msg, 'co-deadline')
          setNotified('co_deadline')
          notifiedRef.current = { ...getNotified(), co_deadline: true }
        }
      }
    }, 30000) // check every 30 seconds

    return () => clearInterval(interval)
  }, [enabled, checkInDeadline, checkOutDeadline, hasCheckedIn, hasCheckedOut])
}
