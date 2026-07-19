import { useState } from 'react'

export default function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <defs>
          <linearGradient id="logoGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0EA5E9" />
            <stop offset="1" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        <rect width="48" height="48" rx="12" fill="url(#logoGrad)" />
        <text x="24" y="30" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="serif">CR</text>
      </svg>
    )
  }

  return (
    <img
      src="/logo-school.png"
      alt="Cahaya Rancamaya"
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={() => setImgError(true)}
    />
  )
}
