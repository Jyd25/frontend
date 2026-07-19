import { cn } from '@/lib/utils'

interface Column<T> {
  key: string
  header: string
  className?: string
  render?: (item: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
}

export default function DataTable<T extends Record<string, any>>({ columns, data, loading, emptyMessage = 'Tidak ada data' }: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-200 border-t-teal-600" />
        <p className="text-xs text-gray-400">Memuat data...</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-16 text-center">
              <p className="text-sm text-gray-400">{emptyMessage}</p>
            </td></tr>
          ) : (
            data.map((item, i) => (
              <tr key={item.id || i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render ? col.render(item, i) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
