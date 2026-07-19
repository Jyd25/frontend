import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { locationService } from '@/services/location.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { AttendanceLocation } from '@/types/api'

interface FormState {
  location_name: string
  latitude: string
  longitude: string
  radius: string
  address: string
}

const emptyForm: FormState = { location_name: '', latitude: '', longitude: '', radius: '', address: '' }

export default function LocationListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formModal, setFormModal] = useState<{ open: boolean; location: AttendanceLocation | null }>({
    open: false,
    location: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; location: AttendanceLocation | null }>({
    open: false,
    location: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['locations', page, debouncedSearch],
    queryFn: () => locationService.getAll({ page, per_page: 10, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<AttendanceLocation>) => locationService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Lokasi berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan lokasi')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AttendanceLocation> }) =>
      locationService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Lokasi berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui lokasi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => locationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Lokasi berhasil dihapus')
      setDeleteModal({ open: false, location: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus lokasi')
    },
  })

  function openFormModal(loc?: AttendanceLocation) {
    if (loc) {
      setFormModal({ open: true, location: loc })
      setForm({
        location_name: loc.location_name,
        latitude: loc.latitude.toString(),
        longitude: loc.longitude.toString(),
        radius: loc.radius.toString(),
        address: loc.address || '',
      })
    } else {
      setFormModal({ open: true, location: null })
      setForm(emptyForm)
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, location: null })
    setForm(emptyForm)
  }

  function handleFormSubmit() {
    if (!form.location_name.trim()) {
      toast.error('Nama lokasi wajib diisi')
      return
    }
    const payload: Partial<AttendanceLocation> = {
      location_name: form.location_name,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius: Number(form.radius),
      address: form.address || undefined,
    }
    if (formModal.location) {
      updateMutation.mutate({ id: formModal.location.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const columns = [
    { key: 'location_name', header: 'Nama Lokasi' },
    { key: 'latitude', header: 'Latitude' },
    { key: 'longitude', header: 'Longitude' },
    {
      key: 'radius',
      header: 'Radius (m)',
      render: (item: AttendanceLocation) => `${item.radius} m`,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: AttendanceLocation) => (
        <Badge variant={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: AttendanceLocation) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, location: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const locations = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Lokasi Absensi</h1>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari lokasi..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__locSearchTimeout)
              ;(globalThis as any).__locSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={locations} loading={isLoading} emptyMessage="Tidak ada data lokasi" />
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
        title={formModal.location ? 'Edit Lokasi' : 'Tambah Lokasi'}
      >
        <div className="space-y-4">
          <Input
            label="Nama Lokasi"
            value={form.location_name}
            onChange={(e) => setForm({ ...form, location_name: e.target.value })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => setForm({ ...form, latitude: e.target.value })}
            />
            <Input
              label="Longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => setForm({ ...form, longitude: e.target.value })}
            />
          </div>
          <Input
            label="Radius (meter)"
            type="number"
            value={form.radius}
            onChange={(e) => setForm({ ...form, radius: e.target.value })}
          />
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Alamat</label>
            <textarea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={2}
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

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, location: null })} title="Hapus Lokasi">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus lokasi <strong>{deleteModal.location?.location_name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, location: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.location && deleteMutation.mutate(deleteModal.location.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
