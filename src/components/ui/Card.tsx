import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  headerAction?: React.ReactNode
}

export default function Card({ children, className, title, description, headerAction }: CardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-gray-200/80 shadow-sm", className)}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}
