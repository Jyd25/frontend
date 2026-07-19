import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { employeeService } from '@/services/employee.service'
import { departmentService } from '@/services/department.service'
import { positionService } from '@/services/position.service'
import { scheduleService } from '@/services/schedule.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

const schema = z.object({
  nik: z.string().min(1, 'NIK wajib diisi'),
  name: z.string().min(1, 'Nama wajib diisi'),
  gender: z.string().min(1, 'Gender wajib dipilih'),
  place_of_birth: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().optional(),
  department_id: z.string().min(1, 'Departemen wajib dipilih'),
  position_id: z.string().min(1, 'Jabatan wajib dipilih'),
  schedule_id: z.string().min(1, 'Jadwal wajib dipilih'),
  photo: z.any().optional(),
  user_password: z.string().min(6, 'Password minimal 6 karakter').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

export default function EmployeeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      gender: '',
      department_id: '',
      position_id: '',
      schedule_id: '',
    },
  })

  const { data: existingEmployee, isLoading: loadingEmployee } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeService.getById(Number(id)),
    enabled: isEdit,
  })

  const { data: departments } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentService.getAll({ per_page: 100 }),
  })

  const { data: positions } = useQuery({
    queryKey: ['positions-select'],
    queryFn: () => positionService.getAll({ per_page: 100 }),
  })

  const { data: schedules } = useQuery({
    queryKey: ['schedules-select'],
    queryFn: () => scheduleService.getAll({ per_page: 100 }),
  })

  useEffect(() => {
    if (existingEmployee) {
      reset({
        nik: existingEmployee.nik,
        name: existingEmployee.name,
        gender: existingEmployee.gender,
        phone: existingEmployee.phone || '',
        email: existingEmployee.email || '',
        department_id: existingEmployee.department?.id?.toString() || '',
        position_id: existingEmployee.position?.id?.toString() || '',
        schedule_id: existingEmployee.schedule?.id?.toString() || '',
      })
    }
  }, [existingEmployee, reset])

  const mutation = useMutation({
    mutationFn: (formData: FormData) => {
      const fd = new FormData()
      fd.append('nik', formData.nik)
      fd.append('name', formData.name)
      fd.append('gender', formData.gender)
      if (formData.place_of_birth) fd.append('place_of_birth', formData.place_of_birth)
      if (formData.date_of_birth) fd.append('date_of_birth', formData.date_of_birth)
      if (formData.phone) fd.append('phone', formData.phone)
      if (formData.email) fd.append('email', formData.email)
      if (formData.address) fd.append('address', formData.address)
      fd.append('department_id', formData.department_id)
      fd.append('position_id', formData.position_id)
      fd.append('schedule_id', formData.schedule_id)
      if (formData.photo?.[0]) fd.append('photo', formData.photo[0])
      if (formData.user_password) fd.append('user_password', formData.user_password)

      return isEdit ? employeeService.update(Number(id), fd) : employeeService.create(fd)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success(isEdit ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan')
      navigate('/employees')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menyimpan karyawan')
    },
  })

  if (isEdit && loadingEmployee) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-sky-200 border-t-teal-600" />
      </div>
    )
  }

  const deptList = departments?.data?.items || []
  const posList = positions?.data?.items || []
  const schedList = schedules?.data?.items || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/employees')}>
          <ArrowLeft size={16} />
        </Button>
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">
          {isEdit ? 'Edit Karyawan' : 'Tambah Karyawan'}
        </h1>
      </div>

      <Card className="rounded-xl">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="NIK" {...register('nik')} error={errors.nik?.message} />
            <Input label="Nama" {...register('name')} error={errors.name?.message} />
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500">Gender</label>
              <select
                {...register('gender')}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Pilih Gender</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
              {errors.gender?.message && <p className="text-xs text-red-500">{errors.gender.message}</p>}
            </div>
            <Input label="Tempat Lahir" {...register('place_of_birth')} />
            <Input label="Tanggal Lahir" type="date" {...register('date_of_birth')} />
            <Input label="No HP" {...register('phone')} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Alamat</label>
            <textarea
              {...register('address')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500">Departemen</label>
              <select
                {...register('department_id')}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Pilih Departemen</option>
                {deptList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.department_id?.message && <p className="text-xs text-red-500">{errors.department_id.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500">Jabatan</label>
              <select
                {...register('position_id')}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Pilih Jabatan</option>
                {posList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {errors.position_id?.message && <p className="text-xs text-red-500">{errors.position_id.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500">Jadwal</label>
              <select
                {...register('schedule_id')}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value="">Pilih Jadwal</option>
                {schedList.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.schedule_id?.message && <p className="text-xs text-red-500">{errors.schedule_id.message}</p>}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Foto</label>
            <input
              type="file"
              accept="image/*"
              {...register('photo')}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-900"
            />
          </div>

          <div className="border-t border-gray-200/80 pt-4 mt-2">
            <p className="text-sm font-semibold text-gray-900 mb-3">Akun User (otomatis dibuat)</p>
            <Input
              label="Password Akun"
              type="password"
              placeholder={isEdit ? 'Kosongkan jika tidak ubah' : 'Password untuk login (default: password123)'}
              error={errors.user_password?.message}
              {...register('user_password')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/employees')}>
              Batal
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEdit ? 'Simpan Perubahan' : 'Tambah Karyawan'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
