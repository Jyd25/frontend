import { useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

interface ReminderOptions {
  enabled: boolean
  checkInDeadlineMin?: number
  checkOutDeadlineMin?: number
  hasCheckedIn: boolean
  hasCheckedOut: boolean
}

const NOTIFIED_KEY = 'attendance_notified_v2'

function wibParts(): { h: number; m: number; day: string } {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })
  const parts = fmt.formatToParts(new Date())
  let day = ''
  let h = 0
  let m = 0
  for (const p of parts) {
    if (p.type === 'year' || p.type === 'month' || p.type === 'day') day += p.value
    else if (p.type === 'hour') h = Number(p.value) % 24
    else if (p.type === 'minute') m = Number(p.value)
  }
  return { h, m, day }
}

function formatClock(totalMin: number): string {
  const h = Math.floor(totalMin / 60) % 24
  const m = totalMin % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

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
  if ('Notification' in window && Notification.permission === 'granted') {
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
  checkInDeadlineMin = 540,
  checkOutDeadlineMin = 1200,
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
      const { h, m, day } = wibParts()
      const total = h * 60 + m
      const n = notifiedRef.current
      const ciClock = formatClock(checkInDeadlineMin)
      const coClock = formatClock(checkOutDeadlineMin)

      if (!hasCheckedIn) {
        if (total === checkInDeadlineMin - 5 && !n[`${day}:ci_5min`]) {
          const msg = `Batas check-in ${ciClock} 5 menit lagi. Siap-siap absen!`
          toast.warning(msg, { duration: 10000 })
          showBrowserNotification('Pengingat Check-In', msg, `${day}-ci-5min`)
          setNotified(`${day}:ci_5min`)
          notifiedRef.current = { ...getNotified(), [`${day}:ci_5min`]: true }
        }

        if (total === checkInDeadlineMin && !n[`${day}:ci_deadline`]) {
          const msg = `Batas check-in ${ciClock} sudah lewat! Status akan tercatat Terlambat.`
          toast.error(msg, { duration: 15000 })
          showBrowserNotification('Batas Check-In Lewat!', msg, `${day}-ci-deadline`)
          setNotified(`${day}:ci_deadline`)
          notifiedRef.current = { ...getNotified(), [`${day}:ci_deadline`]: true }
        }

        if (
          m === 0 &&
          total > checkInDeadlineMin &&
          total <= checkOutDeadlineMin &&
          h !== 12 &&
          !n[`${day}:ci_hourly_${h}`]
        ) {
          const msg = `Anda belum check-in hari ini (${String(h).padStart(2, '0')}:00). Segera lakukan kehadiran!`
          toast.warning(msg, { duration: 8000 })
          showBrowserNotification('Belum Check-In', msg, `${day}-ci-hourly-${h}`)
          setNotified(`${day}:ci_hourly_${h}`)
          notifiedRef.current = { ...getNotified(), [`${day}:ci_hourly_${h}`]: true }
        }
      }

      if (hasCheckedIn && !hasCheckedOut) {
        if (total === checkOutDeadlineMin - 60 && !n[`${day}:co_60min`]) {
          const msg = `1 jam lagi sebelum batas check-out (${coClock}). Jangan lupa absen!`
          toast.info(msg, { duration: 10000 })
          showBrowserNotification('Pengingat Check-Out', msg, `${day}-co-60min`)
          setNotified(`${day}:co_60min`)
          notifiedRef.current = { ...getNotified(), [`${day}:co_60min`]: true }
        }

        if (total === checkOutDeadlineMin - 15 && !n[`${day}:co_15min`]) {
          const msg = `15 menit lagi sebelum batas check-out (${coClock}). Segera check-out!`
          toast.warning(msg, { duration: 10000 })
          showBrowserNotification('Check-Out Segera!', msg, `${day}-co-15min`)
          setNotified(`${day}:co_15min`)
          notifiedRef.current = { ...getNotified(), [`${day}:co_15min`]: true }
        }

        if (total === checkOutDeadlineMin && !n[`${day}:co_deadline`]) {
          const msg = `Batas check-out ${coClock} sudah lewat! Segera check-out!`
          toast.error(msg, { duration: 15000 })
          showBrowserNotification('Batas Check-Out Lewat!', msg, `${day}-co-deadline`)
          setNotified(`${day}:co_deadline`)
          notifiedRef.current = { ...getNotified(), [`${day}:co_deadline`]: true }
        }
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [enabled, checkInDeadlineMin, checkOutDeadlineMin, hasCheckedIn, hasCheckedOut])
}