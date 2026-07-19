import { useQuery, useMutation } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authService.login(email, password),
    onSuccess: (data) => {
      setAuth(data.user, data.token.access_token, data.token.refresh_token)
      const defaultRoute = ['Administrator', 'Pimpinan'].includes(data.user.role?.name) ? '/dashboard' : '/attendance'
      toast.success(`Login berhasil! Selamat datang, ${data.user.name}`, {
        description: `Role: ${data.user.role?.name || '-'}`,
        duration: 3000,
      })
      // Request browser notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      setTimeout(() => navigate(defaultRoute, { replace: true }), 600)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login gagal')
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout()
      navigate('/login')
    },
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: authService.getProfile,
    staleTime: 5 * 60 * 1000,
  })
}
