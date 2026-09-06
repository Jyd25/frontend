import { useLogin, useGuestLogin } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { Mail, Lock, ArrowRight, UserRound } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  remember_me: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const login = useLogin()
  const guestLogin = useGuestLogin()
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginForm) => {
    login.mutate(data)
  }

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-white to-gray-200 shadow-lg shadow-gray-200/50 border border-gray-100 mb-4">
          <Logo size={36} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">
          Cahaya Rancamaya
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Islamic Boarding School
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="nama@scr.sch.id"
          icon={<Mail size={16} />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Masukkan password"
          icon={<Lock size={16} />}
          error={errors.password?.message}
          {...register('password')}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            {...register('remember_me')}
          />
          <span className="text-sm text-gray-600">Ingat saya</span>
        </label>
        <Button type="submit" loading={login.isPending} className="w-full group" size="lg">
          Masuk
          <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">atau</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <Button
        type="button"
        variant="outline"
        loading={guestLogin.isPending}
        disabled={login.isPending}
        onClick={() => guestLogin.mutate()}
        className="w-full"
        size="lg"
      >
        <UserRound size={16} />
        Login sebagai Tamu
      </Button>
      <p className="text-xs text-gray-400 text-center mt-2">
        Masuk tanpa password untuk demo / penguji
      </p>

      <p className="text-xs text-gray-400 text-center mt-6">
        Sistem Kehadiran Digital
      </p>
    </div>
  )
}
