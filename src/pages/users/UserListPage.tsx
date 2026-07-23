import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2, Shield } from 'lucide-react'
import { userService, type CreateUserPayload } from '@/services/user.service'
import api from '@/lib/axios'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { User } from '@/types/api'

export default function UserListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formModal, setFormModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; user: User | null }>({
    open: false,
    user: null,
  })

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: 0,
    employee_id: null as number | null,
    status: 'active',
  })

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, debouncedSearch],
    queryFn: () => userService.getAll({ page, per_page: 10, search: debouncedSearch }),
    staleTime: 10000,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles-list'],
    queryFn: async () => {
      const { data } = await api.get('/roles')
      return data.data as { id: number; name: string }[]
    },
    staleTime: 60000,
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: async () => {
      const { data } = await api.get('/employees', { params: { per_page: 200 } })
      return (data.data?.items || data.data || []) as { id: number; name: string; nik: string; position?: { id: number; name: string; role?: { id: number; name: string } } }[]
    },
    staleTime: 30000,
  })

  const roleOptions = rolesData || []

  const autoRoleFromEmployee = (employeeId: number | null) => {
    if (!employeeId || !employeesData) return
    const emp = employeesData.find((e) => e.id === employeeId)
    if (emp?.position?.role) {
      setForm((prev) => ({ ...prev, employee_id: employeeId, role_id: emp.position!.role!.id, name: prev.name || emp.name, email: prev.email || '' }))
    } else {
      setForm((prev) => ({ ...prev, employee_id: employeeId }))
    }
  }

  const selectedEmployee = form.employee_id ? employeesData?.find((e) => e.id === form.employee_id) : null
  const autoRoleName = selectedEmployee?.position?.role?.name

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => userService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan user')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      userService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui user')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User berhasil dihapus')
      setDeleteModal({ open: false, user: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus user')
    },
  })

  function openFormModal(user?: User) {
    if (user) {
      setFormModal({ open: true, user })
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        password_confirmation: '',
        role_id: user.role?.id || 0,
        employee_id: user.employee?.id || null,
        status: user.status || 'active',
      })
    } else {
      setFormModal({ open: true, user: null })
      setForm({ name: '', email: '', password: '', password_confirmation: '', role_id: 0, employee_id: null, status: 'active' })
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, user: null })
    setForm({ name: '', email: '', password: '', password_confirmation: '', role_id: 0, employee_id: null, status: 'active' })
  }

  function handleFormSubmit() {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Nama dan email wajib diisi')
      return
    }
    if (!formModal.user && !form.password) {
      toast.error('Password wajib diisi untuk user baru')
      return
    }
    if (form.password && form.password !== form.password_confirmation) {
      toast.error('Konfirmasi password tidak cocok')
      return
    }
    if (!form.role_id) {
      toast.error('Role wajib dipilih')
      return
    }

    if (formModal.user) {
      const payload: any = { name: form.name, email: form.email, role_id: form.role_id, status: form.status, employee_id: form.employee_id }
      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }
      updateMutation.mutate({ id: formModal.user.id, payload })
    } else {
      createMutation.mutate({
        name: form.name,
        email: form.email,
        password: form.password,
        password_confirmation: form.password_confirmation,
        role_id: form.role_id,
        employee_id: form.employee_id,
        status: form.status,
      })
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'active':
        return <Badge variant="success">Aktif</Badge>
      case 'inactive':
        return <Badge variant="danger">Nonaktif</Badge>
      case 'suspended':
        return <Badge variant="warning">Suspended</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  function getRoleBadge(roleName?: string) {
    switch (roleName) {
      case 'Administrator':
        return <Badge variant="danger"><Shield size={10} className="mr-1 inline" />Admin</Badge>
      case 'Pimpinan':
        return <Badge variant="info">Pimpinan</Badge>
      case 'Guru':
        return <Badge variant="success">Guru</Badge>
      case 'Karyawan':
        return <Badge variant="warning">Karyawan</Badge>
      default:
        return <Badge>{roleName || '-'}</Badge>
    }
  }

  const columns = [
    { key: 'name', header: 'Nama' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: (item: User) => getRoleBadge(item.role?.name),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: User) => getStatusBadge(item.status),
    },
    {
      key: 'employee',
      header: 'Karyawan',
      render: (item: User) => item.employee?.name || <span className="text-gray-400">-</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: User) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, user: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const users = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Manajemen User</h1>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari user..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__userSearchTimeout)
              ;(globalThis as any).__userSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={users} loading={isLoading} emptyMessage="Tidak ada data user" />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80">
            <p className="text-sm text-gray-500">Halaman {page} dari {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={formModal.open}
        onClose={closeFormModal}
        title={formModal.user ? 'Edit User' : 'Tambah User'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Karyawan (Opsional)</label>
            <select
              value={form.employee_id ?? ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null
                autoRoleFromEmployee(val)
              }}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            >
              <option value="">Tidak dikaitkan</option>
              {employeesData?.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name} — {emp.position?.name || '-'}</option>
              ))}
            </select>
            {selectedEmployee?.position && (
              <p className="text-[11px] text-sky-600 mt-1">Jabatan: {selectedEmployee.position.name}</p>
            )}
          </div>
          <Input
            label="Nama"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label={formModal.user ? 'Password (kosongkan jika tidak ubah)' : 'Password'}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {form.password && (
            <Input
              label="Konfirmasi Password"
              type="password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            />
          )}
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Role</label>
            {autoRoleName ? (
              <div className="flex items-center gap-2">
                {getRoleBadge(autoRoleName)}
                <span className="text-[11px] text-gray-400">Otomatis dari jabatan</span>
              </div>
            ) : (
              <select
                value={form.role_id}
                onChange={(e) => setForm({ ...form, role_id: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
              >
                <option value={0}>Pilih Role</option>
                {roleOptions.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeFormModal}>Batal</Button>
            <Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleFormSubmit}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, user: null })} title="Hapus User">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus user <strong>{deleteModal.user?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, user: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.user && deleteMutation.mutate(deleteModal.user.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
