import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { employeeService } from '@/services/employee.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import DataTable from '@/components/ui/DataTable'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { Employee } from '@/types/api'

export default function EmployeeListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; employee: Employee | null }>({
    open: false,
    employee: null,
  })

  useState(() => {
    let timeout: ReturnType<typeof setTimeout>
    return {
      handleChange: (value: string) => {
        setSearch(value)
        clearTimeout(timeout)
        timeout = setTimeout(() => {
          setDebouncedSearch(value)
          setPage(1)
        }, 300)
      },
    }
  })

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, debouncedSearch],
    queryFn: () => employeeService.getAll({ page, per_page: 10, search: debouncedSearch }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Karyawan berhasil dihapus')
      setDeleteModal({ open: false, employee: null })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Gagal menghapus karyawan')
    },
  })

  const columns = [
    { key: 'nik', header: 'NIK' },
    { key: 'name', header: 'Nama' },
    {
      key: 'gender',
      header: 'Gender',
      render: (item: Employee) => (
        <Badge variant={item.gender === 'Laki-laki' ? 'info' : 'warning'}>
          {item.gender}
        </Badge>
      ),
    },
    { key: 'department', header: 'Departemen', render: (item: Employee) => item.department?.name || '-' },
    { key: 'position', header: 'Jabatan', render: (item: Employee) => item.position?.name || '-' },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: Employee) => (
        <Badge variant={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Aksi',
      className: 'text-right',
      render: (item: Employee) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${item.id}/edit`)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, employee: item })}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      ),
    },
  ]

  const employees = data?.data?.items || []
  const totalPages = data?.data?.pagination?.last_page || 1

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Karyawan</h1>
        <Button onClick={() => navigate('/employees/create')}>
          <Plus size={16} className="mr-2" /> Tambah
        </Button>
      </div>

      <Card className="rounded-xl">
        <div className="mb-4">
          <Input
            placeholder="Cari karyawan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              clearTimeout((globalThis as any).__empSearchTimeout)
              ;(globalThis as any).__empSearchTimeout = setTimeout(() => {
                setDebouncedSearch(e.target.value)
                setPage(1)
              }, 300)
            }}
            icon={<Search size={16} />}
          />
        </div>
        <DataTable columns={columns} data={employees} loading={isLoading} emptyMessage="Tidak ada data karyawan" />
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200/80">
            <p className="text-sm text-gray-500">
              Halaman {page} dari {totalPages}
            </p>
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

      <Modal open={deleteModal.open} onClose={() => setDeleteModal({ open: false, employee: null })} title="Hapus Karyawan">
        <p className="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus karyawan <strong>{deleteModal.employee?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteModal({ open: false, employee: null })}>
            Batal
          </Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={() => deleteModal.employee && deleteMutation.mutate(deleteModal.employee.id)}
          >
            Hapus
          </Button>
        </div>
      </Modal>
    </div>
  )
}
