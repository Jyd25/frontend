import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CalendarOff, Search } from 'lucide-react'
import { holidayService, type Holiday, type HolidayPayload } from '@/services/holiday.service'
import { invalidateAdminQueries } from '@/lib/queryInvalidation'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

interface FormState {
  name: string
  date: string
  type: 'national' | 'collective'
  description: string
}

const emptyForm: FormState = { name: '', date: '', type: 'national', description: '' }

const TYPE_LABELS: Record<Holiday['type'], string> = {
  national: 'Libur Nasional',
  collective: 'Cuti Bersama',
}

export default function HolidayListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; holiday: Holiday | null }>({
    open: false,
    holiday: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; holiday: Holiday | null }>({
    open: false,
    holiday: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['holidays'],
    queryFn: () => holidayService.getAll(),
    staleTime: 30000,
  })

  const createMutation = useMutation({
    mutationFn: (payload: HolidayPayload) => holidayService.create(payload),
    onSuccess: () => {
      invalidateAdminQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      queryClient.invalidateQueries({ queryKey: ['holiday-today'] })
      queryClient.invalidateQueries({ queryKey: ['holidays-month'] })
      toast.success('Hari libur berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan hari libur')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HolidayPayload }) =>
      holidayService.update(id, payload),
    onSuccess: () => {
      invalidateAdminQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      queryClient.invalidateQueries({ queryKey: ['holiday-today'] })
      queryClient.invalidateQueries({ queryKey: ['holidays-month'] })
      toast.success('Hari libur berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui hari libur')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => holidayService.remove(id),
    onSuccess: () => {
      invalidateAdminQueries(queryClient)
      queryClient.invalidateQueries({ queryKey: ['holidays'] })
      queryClient.invalidateQueries({ queryKey: ['holidays-month'] })
      toast.success('Hari libur berhasil dihapus')
      setDeleteModal({ open: false, holiday: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus hari libur')
    },
  })

  function openFormModal(holiday?: Holiday) {
    if (holiday) {
      setFormModal({ open: true, holiday })
      setForm({
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        description: holiday.description || '',
      })
    } else {
      setFormModal({ open: true, holiday: null })
      setForm(emptyForm)
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, holiday: null })
    setForm(emptyForm)
  }

  function handleFormSubmit() {
    if (!form.name.trim()) {
      toast.error('Nama hari libur wajib diisi')
      return
    }
    if (!form.date) {
      toast.error('Tanggal wajib diisi')
      return
    }
    const payload: HolidayPayload = {
      name: form.name.trim(),
      date: form.date,
      type: form.type,
      description: form.description.trim() || null,
    }
    if (formModal.holiday) {
      updateMutation.mutate({ id: formModal.holiday.id, payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const filtered = (data || []).filter((h) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      h.name.toLowerCase().includes(q) ||
      h.date.includes(q) ||
      TYPE_LABELS[h.type]?.toLowerCase().includes(q)
    )
  })

  const columns = [
    { key: 'name', header: 'Nama Hari Libur', render: (item: Holiday) => <span className="font-medium text-gray-900">{item.name}</span> },
    {
      key: 'date',
      header: 'Tanggal',
      render: (item: Holiday) => (
        <span className="text-gray-700 whitespace-nowrap">
          {new Date(item.date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Jenis',
      render: (item: Holiday) => (
        <Badge variant={item.type === 'national' ? 'danger' : 'warning'}>{TYPE_LABELS[item.type]}</Badge>
      ),
    },
    {
      key: 'description',
      header: 'Keterangan',
      render: (item: Holiday) => <span className="text-gray-500">{item.description || '-'}</span>,
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: Holiday) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, holiday: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Hari Libur</h1>
          <p className="text-sm text-gray-500 mt-1">Pada hari libur nasional & cuti bersama, presensi otomatis ditandai Libur</p>
        </div>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari hari libur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={filtered} loading={isLoading} emptyMessage="Tidak ada data hari libur" />
      </Card>

      <Card title="Ringkasan">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-red-50 ring-1 ring-red-500/10">
              <CalendarOff size={15} className="text-red-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{(data || []).filter((h) => h.type === 'national').length}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Libur Nasional</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-50 ring-1 ring-amber-500/10">
              <CalendarOff size={15} className="text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{(data || []).filter((h) => h.type === 'collective').length}</p>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Cuti Bersama</p>
            </div>
          </div>
        </div>
      </Card>

      <Modal
        open={formModal.open}
        onClose={closeFormModal}
        title={formModal.holiday ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Input label="Nama Hari Libur" placeholder="Contoh: Hari Raya Idul Fitri 1447 H" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <div className="space-y-1">
              <label className="block text-[11px] uppercase tracking-wider text-gray-500">Jenis</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'national' | 'collective' })}
                className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors"
              >
                <option value="national">Libur Nasional</option>
                <option value="collective">Cuti Bersama</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Keterangan (opsional)</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Catatan tambahan..."
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors resize-none"
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

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, holiday: null })} title="Hapus Hari Libur">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus <strong>{deleteModal.holiday?.name}</strong> ({deleteModal.holiday?.date})?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, holiday: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.holiday && deleteMutation.mutate(deleteModal.holiday.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
