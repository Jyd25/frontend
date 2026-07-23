import { cn } from '@/lib/utils'
import { forwardRef } from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  headerAction?: React.ReactNode
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, title, description, headerAction, ...props }, ref) => (
    <div ref={ref} className={cn("bg-white rounded-2xl border border-gray-200/80 shadow-sm transition-shadow hover:shadow-md", className)} {...props}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            {title && <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>}
            {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  )
)
Card.displayName = 'Card'
export default Card

function CardHeader({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-6 pt-6 pb-2", className)} {...props}>
      {children}
    </div>
  )
}

function CardTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-[15px] font-semibold leading-none tracking-tight text-gray-900", className)} {...props}>
      {children}
    </h3>
  )
}

function CardDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-xs text-gray-500", className)} {...props}>
      {children}
    </p>
  )
}

function CardContent({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-6 pb-6 pt-2", className)} {...props}>
      {children}
    </div>
  )
}

function CardFooter({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center px-6 pb-6 pt-0", className)} {...props}>
      {children}
    </div>
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
