import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff, Save, Camera } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { authService } from '@/services/auth.service'
import api from '@/lib/axios'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import type { ApiResponse } from '@/types/api'

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const isAdmin = user?.role?.name === 'Administrator'

  const { data: profileData } = useQuery({
    queryKey: ['profile-full'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<any>>('/profile')
      return data.data
    },
    staleTime: 30000,
  })

  const employee = profileData?.employee
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: employee?.phone || '',
    address: employee?.address || '',
    birth_place: employee?.birth_place || '',
    birth_date: employee?.birth_date ? employee.birth_date.split('T')[0] : '',
  })

  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const profileMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<ApiResponse<any>>('/profile', form)
      return data.data
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['profile-full'] })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil berhasil diperbarui')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal memperbarui profil'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => authService.changePassword(pwd.current, pwd.new, pwd.confirm),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      setPwd({ current: '', new: '', confirm: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Gagal mengubah password'),
  })

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Profil Saya</h1>

      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {user?.name?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
          <p className="text-sm text-gray-500">{user?.role?.name} &middot; Cahaya Rancamaya Islamic Boarding School</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 max-w-xs">
        <button onClick={() => setTab('profile')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Edit Profil
        </button>
        <button onClick={() => setTab('password')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
          Ubah Password
        </button>
      </div>

      {tab === 'profile' && (
        <Card>
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama Lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} icon={<User size={16} />} />
              <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} icon={<Mail size={16} />} />
              <Input label="No. HP" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} icon={<Phone size={16} />} />
              <Input label="Tempat Lahir" value={form.birth_place} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} />
              <Input label="Tanggal Lahir" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} icon={<Calendar size={16} />} />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Alamat</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors" />
            </div>

            {employee && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[11px] uppercase tracking-wider font-medium text-gray-500 mb-3">Data Karyawan (Read Only)</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase">NIK</p>
                    <p className="text-sm font-medium text-gray-700">{employee.nik}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Departemen</p>
                    <p className="text-sm font-medium text-gray-700">{employee.department?.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Jabatan</p>
                    <p className="text-sm font-medium text-gray-700">{employee.position?.name || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Jadwal</p>
                    <p className="text-sm font-medium text-gray-700">{employee.schedule ? `${employee.schedule.start_time} - ${employee.schedule.end_time}` : '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-[10px] text-gray-400 uppercase">Status</p>
                    <Badge variant={employee.is_active ? 'success' : 'danger'}>{employee.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button loading={profileMutation.isPending} onClick={() => profileMutation.mutate()}>
                <Save size={16} className="mr-2" /> Simpan Perubahan
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'password' && (
        <Card>
          <div className="space-y-4 max-w-md">
            <div className="relative">
              <Input label="Password Saat Ini" type={showCurrent ? 'text' : 'password'} value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })} icon={<Lock size={16} />} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Input label="Password Baru" type={showNew ? 'text' : 'password'} value={pwd.new}
                onChange={(e) => setPwd({ ...pwd, new: e.target.value })} icon={<Lock size={16} />} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="relative">
              <Input label="Konfirmasi Password Baru" type={showConfirm ? 'text' : 'password'} value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} icon={<Lock size={16} />} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button loading={passwordMutation.isPending} onClick={() => passwordMutation.mutate()}>
                <Lock size={16} className="mr-2" /> Ubah Password
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
