import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { positionService } from '@/services/position.service'
import api from '@/lib/axios'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Position } from '@/types/api'

export default function PositionListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formModal, setFormModal] = useState<{ open: boolean; position: Position | null }>({
    open: false,
    position: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; position: Position | null }>({
    open: false,
    position: null,
  })
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formRoleId, setFormRoleId] = useState<string>('')

  const { data, isLoading } = useQuery({
    queryKey: ['positions', page, debouncedSearch],
    queryFn: () => positionService.getAll({ page, per_page: 10, search: debouncedSearch }),
  })

  const { data: rolesData } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await api.get('/roles')
      return data.data
    },
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Position>) => positionService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast.success('Jabatan berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan jabatan')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Position> }) =>
      positionService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast.success('Jabatan berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui jabatan')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => positionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['positions'] })
      toast.success('Jabatan berhasil dihapus')
      setDeleteModal({ open: false, position: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus jabatan')
    },
  })

  function openFormModal(pos?: Position) {
    if (pos) {
      setFormModal({ open: true, position: pos })
      setFormName(pos.name)
      setFormDesc(pos.description || '')
      setFormRoleId(pos.role_id?.toString() || '')
    } else {
      setFormModal({ open: true, position: null })
      setFormName('')
      setFormDesc('')
      setFormRoleId('')
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, position: null })
    setFormName('')
    setFormDesc('')
    setFormRoleId('')
  }

  function handleFormSubmit() {
    if (!formName.trim()) {
      toast.error('Nama jabatan wajib diisi')
      return
    }
    const payload: Partial<Position> = {
      name: formName,
      description: formDesc,
      role_id: formRoleId ? Number(formRoleId) : undefined,
    }
    if (formModal.position) {
      updateMutation.mutate({ id: formModal.position.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const roles: { id: number; name: string }[] = rolesData || []

  const columns = [
    { key: 'name', header: 'Nama Jabatan' },
    { key: 'description', header: 'Deskripsi', render: (item: Position) => item.description || '-' },
    {
      key: 'role',
      header: 'Role (Hak Akses)',
      render: (item: Position) => item.role ? (
        <Badge variant="info">{item.role.name}</Badge>
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Position) => (
        <Badge variant={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: Position) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, position: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const positions = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Jabatan</h1>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari jabatan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__posSearchTimeout)
              ;(globalThis as any).__posSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={positions} loading={isLoading} emptyMessage="Tidak ada data jabatan" />
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
        title={formModal.position ? 'Edit Jabatan' : 'Tambah Jabatan'}
      >
        <div className="space-y-4">
          <Input label="Nama Jabatan" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Deskripsi</label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Role (Hak Akses)</label>
            <select
              value={formRoleId}
              onChange={(e) => setFormRoleId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 bg-white"
            >
              <option value="">-- Pilih Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeFormModal}>Batal</Button>
            <Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleFormSubmit}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, position: null })} title="Hapus Jabatan">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus jabatan <strong>{deleteModal.position?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, position: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.position && deleteMutation.mutate(deleteModal.position.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
