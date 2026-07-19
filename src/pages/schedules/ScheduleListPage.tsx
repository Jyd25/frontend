import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { scheduleService } from '@/services/schedule.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { WorkSchedule } from '@/types/api'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

interface FormState {
  name: string
  start_time: string
  end_time: string
  working_days: string[]
}

const emptyForm: FormState = { name: '', start_time: '', end_time: '', working_days: [] }

export default function ScheduleListPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [formModal, setFormModal] = useState<{ open: boolean; schedule: WorkSchedule | null }>({
    open: false,
    schedule: null,
  })
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; schedule: WorkSchedule | null }>({
    open: false,
    schedule: null,
  })
  const [form, setForm] = useState<FormState>(emptyForm)

  const { data, isLoading } = useQuery({
    queryKey: ['schedules', page, debouncedSearch],
    queryFn: () => scheduleService.getAll({ page, per_page: 10, search: debouncedSearch }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: Partial<WorkSchedule>) => scheduleService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Jadwal berhasil ditambahkan')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menambahkan jadwal')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<WorkSchedule> }) =>
      scheduleService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Jadwal berhasil diperbarui')
      closeFormModal()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui jadwal')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scheduleService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      toast.success('Jadwal berhasil dihapus')
      setDeleteModal({ open: false, schedule: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus jadwal')
    },
  })

  function openFormModal(sched?: WorkSchedule) {
    if (sched) {
      setFormModal({ open: true, schedule: sched })
      setForm({
        name: sched.name,
        start_time: sched.start_time,
        end_time: sched.end_time,
        working_days: sched.working_days || [],
      })
    } else {
      setFormModal({ open: true, schedule: null })
      setForm(emptyForm)
    }
  }

  function closeFormModal() {
    setFormModal({ open: false, schedule: null })
    setForm(emptyForm)
  }

  function toggleDay(day: string) {
    setForm((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }))
  }

  function handleFormSubmit() {
    if (!form.name.trim()) {
      toast.error('Nama jadwal wajib diisi')
      return
    }
    if (!form.start_time || !form.end_time) {
      toast.error('Jam kerja wajib diisi')
      return
    }
    if (form.working_days.length === 0) {
      toast.error('Pilih minimal satu hari kerja')
      return
    }
    if (formModal.schedule) {
      updateMutation.mutate({ id: formModal.schedule.id, payload: form })
    } else {
      createMutation.mutate(form)
    }
  }

  const columns = [
    { key: 'name', header: 'Nama' },
    { key: 'start_time', header: 'Jam Mulai' },
    { key: 'end_time', header: 'Jam Selesai' },
    {
      key: 'working_days',
      header: 'Hari Kerja',
      render: (item: WorkSchedule) => (
        <div className="flex flex-wrap gap-1">
          {item.working_days?.map((d) => (
            <Badge key={d} variant="info">{d}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: WorkSchedule) => (
        <Badge variant={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: WorkSchedule) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openFormModal(item)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, schedule: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const schedules = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Jadwal Kerja</h1>
        <Button onClick={() => openFormModal()}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari jadwal..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__schedSearchTimeout)
              ;(globalThis as any).__schedSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={schedules} loading={isLoading} emptyMessage="Tidak ada data jadwal" />
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
        title={formModal.schedule ? 'Edit Jadwal' : 'Tambah Jadwal'}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Input label="Nama Jadwal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Jam Mulai"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
            <Input
              label="Jam Selesai"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[11px] uppercase tracking-wider text-gray-500">Hari Kerja</label>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((day) => (
                <label key={day} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.working_days.includes(day)}
                    onChange={() => toggleDay(day)}
                    className="rounded border-gray-300 text-gray-900 focus:ring-sky-500/20"
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={closeFormModal}>Batal</Button>
            <Button loading={createMutation.isPending || updateMutation.isPending} onClick={handleFormSubmit}>
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, schedule: null })} title="Hapus Jadwal">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus jadwal <strong>{deleteModal.schedule?.name}</strong>?
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, schedule: null })}>Batal</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.schedule && deleteMutation.mutate(deleteModal.schedule.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
