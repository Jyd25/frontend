import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell, CheckCheck, MailOpen } from 'lucide-react'
import { notificationService } from '@/services/notification.service'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import type { Notification } from '@/types/api'

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit yang lalu`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} jam yang lalu`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} hari yang lalu`
}

export default function NotificationPage() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll({ per_page: 50 }),
    staleTime: 10000,
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Semua notifikasi ditandai sudah dibaca')
    },
    onError: () => {
      toast.error('Gagal menandai notifikasi')
    },
  })

  const notifications = data?.data?.items || []
  const unreadCount = notifications.filter((n) => !n.is_read).length

  function handleClick(notif: Notification) {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 rounded-full border-2 border-sky-200 border-t-teal-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Notifikasi</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} belum dibaca</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
            <CheckCheck size={16} className="mr-2" /> <span className="hidden sm:inline">Tandai semua sudah dibaca</span><span className="sm:hidden">Baca semua</span>
          </Button>
        )}
      </div>

      <Card className="p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Bell size={48} className="mb-4 text-gray-300" />
            <p className="text-sm">Tidak ada notifikasi</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/80">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`flex items-start gap-4 px-6 py-4 cursor-pointer transition-colors ${
                  notif.is_read ? 'bg-white hover:bg-gray-50' : 'bg-sky-50/30 hover:bg-sky-50/60'
                }`}
              >
                <div className={`mt-1 p-2 rounded-full ${notif.is_read ? 'bg-gray-100' : 'bg-sky-100'}`}>
                  <MailOpen size={16} className={notif.is_read ? 'text-gray-400' : 'text-sky-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-medium ${notif.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                      {notif.title}
                    </p>
                    {!notif.is_read && (
                      <span className="h-2 w-2 bg-sky-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 mt-1">{timeAgo(notif.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
