import { useState } from 'react'
import { Image } from 'lucide-react'
import ImagePreview from '@/components/ui/ImagePreview'

interface FaceThumbnailProps {
  src?: string | null
  faceStatus?: string
  faceScore?: number
  size?: 'sm' | 'md'
  label?: string
}

export default function FaceThumbnail({ src, faceStatus, faceScore, size = 'sm', label }: FaceThumbnailProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  const sizeClasses = size === 'sm' ? 'w-14 h-14' : 'w-20 h-20'
  const iconSize = size === 'sm' ? 16 : 24

  if (!src) {
    return (
      <div className={`${sizeClasses} rounded-lg border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center flex-shrink-0`}>
        {label ? (
          <span className="text-[9px] text-gray-400 text-center leading-tight px-1">{label}</span>
        ) : (
          <Image size={iconSize} className="text-gray-300" />
        )}
      </div>
    )
  }

  const borderColor = faceStatus === 'Matched' || faceStatus === 'matched' ? 'border-emerald-400' : 'border-amber-400'
  const badgeColor = faceStatus === 'Matched' || faceStatus === 'matched' ? 'bg-emerald-600/90' : 'bg-amber-500/90'

  return (
    <>
      <button
        onClick={() => setPreviewOpen(true)}
        className={`${sizeClasses} rounded-lg overflow-hidden border-2 ${borderColor} flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity relative group`}
        title="Klik untuk preview"
      >
        <img src={src} alt="Wajah" className="w-full h-full object-cover" />
        {faceScore != null && (
          <div className={`absolute bottom-0 inset-x-0 text-center text-[8px] font-bold text-white leading-tight ${badgeColor}`}>
            {faceScore}%
          </div>
        )}
      </button>
      <ImagePreview open={previewOpen} onClose={() => setPreviewOpen(false)} src={src} alt="Preview Wajah" />
    </>
  )
}
