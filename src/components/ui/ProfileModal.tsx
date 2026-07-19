import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/stores/useAuthStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: ProfileModalProps) {
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const profileMutation = useMutation({
    mutationFn: () => authService.updateProfile({ name, email }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Profil berhasil diperbarui')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui profil')
    },
  })

  const passwordMutation = useMutation({
    mutationFn: () => authService.changePassword(currentPassword, newPassword, confirmPassword),
    onSuccess: () => {
      toast.success('Password berhasil diubah')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal mengubah password')
    },
  })

  function handleProfileSubmit() {
    if (!name.trim()) return toast.error('Nama wajib diisi')
    if (!email.trim()) return toast.error('Email wajib diisi')
    profileMutation.mutate()
  }

  function handlePasswordSubmit() {
    if (!currentPassword) return toast.error('Password saat ini wajib diisi')
    if (newPassword.length < 6) return toast.error('Password baru minimal 6 karakter')
    if (newPassword !== confirmPassword) return toast.error('Konfirmasi password tidak cocok')
    passwordMutation.mutate()
  }

  return (
    <Modal open={open} onClose={onClose} title="Profil Saya">
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setTab('profile')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Edit Profil
        </button>
        <button
          onClick={() => setTab('password')}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Ubah Password
        </button>
      </div>

      {tab === 'profile' && (
        <div className="space-y-4">
          <Input
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User size={16} />}
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={16} />}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button loading={profileMutation.isPending} onClick={handleProfileSubmit}>Simpan</Button>
          </div>
        </div>
      )}

      {tab === 'password' && (
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Password Saat Ini"
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              icon={<Lock size={16} />}
            />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
              {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Password Baru"
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<Lock size={16} />}
            />
            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
              {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Konfirmasi Password Baru"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={16} />}
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600">
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button loading={passwordMutation.isPending} onClick={handlePasswordSubmit}>Ubah Password</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
