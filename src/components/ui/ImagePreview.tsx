import { useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

interface ImagePreviewProps {
  open: boolean
  onClose: () => void
  src: string | null
  alt?: string
  faceStatus?: string
  faceScore?: number
}

export default function ImagePreview({ open, onClose, src, alt = 'Preview', faceStatus, faceScore }: ImagePreviewProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open || !src) return null

  const isMatched = faceStatus === 'Matched' || faceStatus === 'matched'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-20 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
        >
          <X size={16} className="text-gray-700" />
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
        />
        {(faceStatus || faceScore != null) && (
          <div className="mt-3 flex items-center justify-center gap-4">
            {faceStatus && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${isMatched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                <span className={`w-2 h-2 rounded-full ${isMatched ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isMatched ? 'Terverifikasi' : 'Tidak Cocok'}
              </span>
            )}
            {faceScore != null && (
              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${isMatched ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                Skor: {faceScore}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
