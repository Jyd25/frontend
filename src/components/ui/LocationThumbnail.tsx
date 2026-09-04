import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapPin, Navigation } from 'lucide-react'

interface LocationThumbnailProps {
  userLat?: number | null
  userLng?: number | null
  centerLat?: number | null
  centerLng?: number | null
  radius?: number | null
  locationName?: string | null
  distance?: number | null
  address?: string | null
  size?: 'sm' | 'md'
}

function formatDistance(m?: number | null) {
  if (m == null) return null
  if (m < 1000) return `${m.toFixed(0)}m`
  return `${(m / 1000).toFixed(2)}km`
}

export default function LocationThumbnail({
  userLat,
  userLng,
  centerLat,
  centerLng,
  radius,
  locationName,
  distance,
  address,
  size = 'sm',
}: LocationThumbnailProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [open, setOpen] = useState(false)

  const hasCoords = userLat != null && userLng != null

  useEffect(() => {
    if (!open || !mapRef.current || mapInstanceRef.current || !hasCoords) return
    if (!mapRef.current.offsetWidth || !mapRef.current.offsetHeight) return

    let map: L.Map | undefined
    try {
      map = L.map(mapRef.current, { zoomControl: true }).setView([userLat!, userLng!], 15)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map)

      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([userLat!, userLng!], { icon: userIcon }).addTo(map)
        .bindPopup(`<b>Lokasi Verifikasi</b><br/>${Number(userLat).toFixed(6)}, ${Number(userLng).toFixed(6)}`)
        .openPopup()

      if (centerLat != null && centerLng != null) {
        if (radius != null && radius > 0) {
          L.circle([centerLat, centerLng], {
            radius,
            color: '#0ea5e9',
            fillColor: '#0ea5e9',
            fillOpacity: 0.08,
            weight: 2,
            dashArray: '6 4',
          }).addTo(map).bindPopup(`<b>${locationName || 'Lokasi'}</b><br/>Radius: ${radius}m`)
        }

        const centerIcon = L.divIcon({
          className: '',
          html: `<div style="width:13px;height:13px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
          iconSize: [13, 13],
          iconAnchor: [7, 7],
        })
        L.marker([centerLat, centerLng], { icon: centerIcon }).addTo(map)

        if (distance != null) {
          L.polyline([[userLat!, userLng!], [centerLat, centerLng]], {
            color: '#ef4444',
            weight: 2,
            dashArray: '8 6',
          }).addTo(map)
        }

        try {
          const bounds = L.latLngBounds([[userLat!, userLng!], [centerLat, centerLng]]).pad(0.3)
          map.fitBounds(bounds)
        } catch {}
      } else {
        map.setView([userLat!, userLng!], 15)
      }

      mapInstanceRef.current = map
    } catch {
      if (map) { try { map.remove() } catch {} }
      mapInstanceRef.current = null
    }
    return () => {
      if (mapInstanceRef.current) { try { mapInstanceRef.current.remove() } catch {} }
      mapInstanceRef.current = null
    }
  }, [open, hasCoords, userLat, userLng, centerLat, centerLng, radius, locationName, distance])

  const distText = formatDistance(distance)

  if (!hasCoords) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-500">
        <MapPin size={12} className="text-gray-300" />
        <span className="max-w-[150px] truncate">{address || '-'}</span>
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Klik untuk lihat peta lokasi"
        className={`${size === 'sm' ? 'w-28 h-16' : 'w-36 h-20'} rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity relative`}
      >
        <MiniMap userLat={userLat!} userLng={userLng!} />
        <span className="absolute top-0.5 right-0.5 inline-flex items-center gap-0.5 px-1 py-px rounded bg-white/90 text-[8px] font-semibold text-blue-600 shadow-sm">
          <Navigation size={8} />
          {distText ?? '?'}
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="relative z-10 w-[90vw] max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{locationName || 'Lokasi Verifikasi'}</p>
                {address && <p className="text-xs text-gray-500 truncate">{address}</p>}
              </div>
              <button onClick={() => setOpen(false)} className="ml-3 w-7 h-7 rounded-full bg-white hover:bg-gray-100 flex items-center justify-center text-gray-500 shadow-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div ref={mapRef} className="w-full h-[300px]" />
            <div className="flex flex-wrap gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-700">
                <Navigation size={12} /> Jarak: {distText ?? '-'}
              </span>
              {distance != null && radius != null && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded ${distance <= radius ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  <MapPin size={12} /> {distance <= radius ? 'Dalam Radius' : 'Luar Radius'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MiniMap({ userLat, userLng }: { userLat: number; userLng: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inst = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!ref.current || inst.current) return
    if (!ref.current.offsetWidth || !ref.current.offsetHeight) return
    let map: L.Map | undefined
    try {
      map = L.map(ref.current, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false }).setView([userLat, userLng], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map)
      const dot = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
      L.marker([userLat, userLng], { icon: dot }).addTo(map)
      inst.current = map
    } catch {
      if (map) { try { map.remove() } catch {} }
      inst.current = null
    }
    return () => {
      if (inst.current) { try { inst.current.remove() } catch {} }
      inst.current = null
    }
  }, [userLat, userLng])

  return <div ref={ref} className="w-full h-full" />
}
