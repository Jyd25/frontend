import { useState, useEffect } from 'react'

interface RealTimeClockProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDate?: boolean
  showSeconds?: boolean
  showLive?: boolean
  className?: string
}

export default function RealTimeClock({ size = 'md', showDate = true, showSeconds = true, showLive = false, className = '' }: RealTimeClockProps) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hours = now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false })
  const minutes = now.toLocaleTimeString('id-ID', { minute: '2-digit' })
  const seconds = showSeconds ? now.toLocaleTimeString('id-ID', { second: '2-digit' }) : null

  const date = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const sizeConfig = {
    sm: { time: 'text-lg', sep: 'text-sm', date: 'text-xs' },
    md: { time: 'text-2xl', sep: 'text-base', date: 'text-sm' },
    lg: { time: 'text-4xl sm:text-5xl', sep: 'text-xl', date: 'text-sm' },
    xl: { time: 'text-5xl sm:text-6xl', sep: 'text-2xl', date: 'text-base' },
  }

  const s = sizeConfig[size]

  return (
    <div className={`text-center ${className}`}>
      <div className={`inline-flex items-baseline gap-0.5 font-mono tabular-nums tracking-tighter`}>
        <span className={`${s.time} font-semibold text-gray-900`}>{hours}</span>
        <span className={`${s.sep} font-light text-sky-500 animate-pulse`}>:</span>
        <span className={`${s.time} font-semibold text-gray-900`}>{minutes}</span>
        {seconds && (
          <>
            <span className={`${s.sep} font-light text-teal-400/60`}>:</span>
            <span className={`${s.time} font-normal text-gray-400`}>{seconds}</span>
          </>
        )}
      </div>
      {showDate && (
        <p className={`${s.date} text-gray-500 mt-1.5 capitalize`}>{date}</p>
      )}
      {showLive && (
        <div className="inline-flex items-center gap-1.5 mt-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
  )
}
