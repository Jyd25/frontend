import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password, remember_me }: { email: string; password: string; remember_me: boolean }) =>
      authService.login(email, password, remember_me),
    onSuccess: (data, variables) => {
      const accessToken = data?.token?.access_token
      const refreshToken = data?.token?.refresh_token

      if (!accessToken || typeof accessToken !== 'string' || accessToken.split('.').length !== 3) {
        toast.error('Respons login tidak valid. Silakan coba lagi.')
        return
      }

      queryClient.clear()
      setAuth(data.user, accessToken, refreshToken ?? accessToken, variables.remember_me)
      const defaultRoute = ['Administrator', 'Pimpinan'].includes(data.user.role?.name) ? '/dashboard' : '/attendance'
      toast.success(`Login berhasil! Selamat datang, ${data.user.name}`, {
        description: `Role: ${data.user.role?.name || '-'}`,
        duration: 3000,
      })
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
      navigate(defaultRoute, { replace: true })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login gagal')
    },
  })
}

export function useGuestLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.guestLogin,
    onSuccess: (data) => {
      const accessToken = data?.token?.access_token
      const refreshToken = data?.token?.refresh_token

      if (!accessToken || typeof accessToken !== 'string' || accessToken.split('.').length !== 3) {
        toast.error('Respons login tamu tidak valid. Silakan coba lagi.')
        return
      }

      queryClient.clear()
      setAuth(data.user, accessToken, refreshToken ?? accessToken, false)
      const defaultRoute = ['Administrator', 'Pimpinan'].includes(data.user.role?.name) ? '/dashboard' : '/attendance'
      toast.success(`Masuk sebagai tamu. Selamat datang, ${data.user.name}`, {
        description: 'Akses demo tanpa password',
        duration: 3000,
      })
      navigate(defaultRoute, { replace: true })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Login tamu gagal')
    },
  })
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.logout,
    onMutate: () => {
      queryClient.clear()
      logout()
      navigate('/login', { replace: true })
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
