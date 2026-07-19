import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-600",
    success: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
    warning: "bg-amber-50 text-amber-700 ring-amber-600/10",
    danger: "bg-red-50 text-red-700 ring-red-600/10",
    info: "bg-teal-50 text-teal-700 ring-teal-600/10",
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ring-1 ring-inset", variants[variant], className)}>
      {children}
    </span>
  )
}
