import { useLogin } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const login = useLogin()
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
        <Button type="submit" loading={login.isPending} className="w-full group" size="lg">
          Masuk
          <ArrowRight size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </form>

      <p className="text-xs text-gray-400 text-center mt-6">
        Sistem Absensi Digital
      </p>
    </div>
  )
}
