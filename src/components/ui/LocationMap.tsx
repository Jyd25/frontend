import { useEffect, useRef } from 'react'
import L from 'leaflet'

interface LocationMapProps {
  userLat: number
  userLng: number
  centerLat: number
  centerLng: number
  radius: number
  locationName: string
}

export default function LocationMap({ userLat, userLng, centerLat, centerLng, radius, locationName }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    const map = L.map(mapRef.current, { zoomControl: false }).setView([userLat, userLng], 16)
    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    })
    L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
      .bindPopup(`<b>Lokasi Anda</b><br/>${userLat.toFixed(6)}, ${userLng.toFixed(6)}`)
      .openPopup()

    L.circle([centerLat, centerLng], {
      radius,
      color: '#0ea5e9',
      fillColor: '#0ea5e9',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '6 4',
    }).addTo(map)
      .bindPopup(`<b>${locationName}</b><br/>Radius: ${radius}m`)

    const centerIcon = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;background:#10b981;border:2px solid white;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.3)"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    })
    L.marker([centerLat, centerLng], { icon: centerIcon }).addTo(map)

    L.polyline([[userLat, userLng], [centerLat, centerLng]], {
      color: '#ef4444',
      weight: 2,
      dashArray: '8 6',
    }).addTo(map)

    const bounds = L.latLngBounds([
      [userLat, userLng],
      [centerLat, centerLng],
    ]).pad(0.3)
    map.fitBounds(bounds)

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [userLat, userLng, centerLat, centerLng, radius, locationName])

  return <div ref={mapRef} className="w-full h-[200px] rounded-lg overflow-hidden border border-gray-200" />
}
