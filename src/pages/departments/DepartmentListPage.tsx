import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { departmentService } from '@/services/department.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Department } from '@/types/api'

export default function DepartmentListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formModal, setFormModal] = useState<{ open: boolean; department: Department | null }>({
    open: false,
    department: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; department: Department | null }>({
    open: false,
    department: null,
  })
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['departments', page, debouncedSearch],
    queryFn: () => departmentService.getAll({ page, per_page: 10, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Department>) => departmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan departemen')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Department> }) =>
      departmentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui departemen')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => departmentService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] })
      toast.success('Departemen berhasil dihapus')
      setDeleteModal({ open: false, department: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus departemen')
    },
  })

  function openFormModal(dept?: Department) {
    if (dept) {
      setFormModal({ open: true, department: dept })
      setFormName(dept.name)
      setFormDesc(dept.description || '')
    } else {
      setFormModal({ open: true, department: null })
      setFormName('')
      setFormDesc('')
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, department: null })
    setFormName('')
    setFormDesc('')
  }

  function handleFormSubmit() {
    if (!formName.trim()) {
      toast.error('Nama departemen wajib diisi')
      return
    }
    const payload = { name: formName, description: formDesc }
    if (formModal.department) {
      updateMutation.mutate({ id: formModal.department.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const columns = [
    { key: 'name', header: 'Nama' },
    { key: 'description', header: 'Deskripsi', render: (item: Department) => item.description || '-' },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Department) => (
        <Badge variant={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: Department) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, department: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const departments = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Departemen</h1>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari departemen..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__deptSearchTimeout)
              ;(globalThis as any).__deptSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={departments} loading={isLoading} emptyMessage="Tidak ada data departemen" />
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
        title={formModal.department ? 'Edit Departemen' : 'Tambah Departemen'}
      >
        <div className="space-y-4">
          <Input label="Nama" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Deskripsi</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeFormModal}>Batal</Button>
            <Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleFormSubmit}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, department: null })} title="Hapus Departemen">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus departemen <strong>{deleteModal.department?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, department: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.department && deleteMutation.mutate(deleteModal.department.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
