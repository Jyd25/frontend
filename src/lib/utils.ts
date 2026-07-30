import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(t?: string | null): string {
  if (!t) return '-'
  if (/^\d{2}:\d{2}$/.test(t)) return t
  try {
    const d = new Date(t)
    if (isNaN(d.getTime())) return t
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false })
  } catch {
    return t
  }
}

export function formatDateFull(iso?: string | null): string {
  if (!iso) return '-'
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return iso || '-'
  }
}
