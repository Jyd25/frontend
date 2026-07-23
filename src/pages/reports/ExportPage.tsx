import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Table } from 'lucide-react'
import { exportService, type ExportData } from '@/services/leave-correction.service'
import { departmentService } from '@/services/department.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

async function exportToPDF(data: ExportData) {
  const [{ default: jsPDF }, autoTable] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  doc.setFontSize(16)
  doc.text(data.title, doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' })
  doc.setFontSize(11)
  doc.text('Periode: ' + data.period, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' })

  let yOffset = 30

  for (const emp of data.items) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${emp.nik} - ${emp.name} (${emp.department} / ${emp.position})`, 14, yOffset)
    yOffset += 2

    const rows = emp.records.map((r) => [r.date, r.check_in, r.check_out, r.status, r.location, r.face])

    ;(doc as any).autoTable({
      startY: yOffset,
      head: [['Tanggal', 'Masuk', 'Pulang', 'Status', 'Lokasi', 'Face']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    })

    yOffset = (doc as any).lastAutoTable.finalY + 8

    if (yOffset > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage()
      yOffset = 15
    }
  }

  doc.save(`laporan-kehadiran-${data.period.replace(/\s/g, '')}.pdf`)
}

async function exportToExcel(data: ExportData) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  const rows: any[][] = [['NIK', 'Nama', 'Departemen', 'Jabatan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Lokasi', 'Face']]
  for (const emp of data.items) {
    for (const r of emp.records) {
      rows.push([emp.nik, emp.name, emp.department, emp.position, r.date, r.check_in, r.check_out, r.status, r.location, r.face])
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 20 }, { wch: 8 },
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Kehadiran')
  XLSX.writeFile(wb, `laporan-kehadiran-${data.period.replace(/\s/g, '')}.xlsx`)
}

export default function ExportPage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [deptId, setDeptId] = useState('')
  const [result, setResult] = useState<ExportData | null>(null)

  const { data: depts } = useQuery({
    queryKey: ['departments-select'],
    queryFn: () => departmentService.getAll({ per_page: 100 }),
    staleTime: 60000,
  })

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!startDate || !endDate) return
    try {
      const data = await exportService.getAttendance({
        start_date: startDate,
        end_date: endDate,
        department_id: deptId ? Number(deptId) : undefined,
        format,
      })
      setResult(data)
      if (format === 'pdf') await exportToPDF(data)
      else await exportToExcel(data)
    } catch {
      (await import('sonner')).toast.error('Gagal mengambil data')
    }
  }

  const deptList = depts?.data?.items || []

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Export Laporan Kehadiran</h1>

      <Card title="Filter Periode">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <Input label="Dari Tanggal" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="Sampai Tanggal" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-medium text-gray-500">Departemen</label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200/80 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-colors">
              <option value="">Semua Departemen</option>
              {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExport('pdf')} disabled={!startDate || !endDate}>
              <FileText size={14} className="mr-1" /> PDF
            </Button>
            <Button onClick={() => handleExport('excel')} disabled={!startDate || !endDate} variant="outline">
              <Download size={14} className="mr-1" /> Excel
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Cepat">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1)
            setStartDate(start.toISOString().split('T')[0]); setEndDate(now.toISOString().split('T')[0])
          }}>
            <Table size={14} className="mr-1" /> Bulan Ini
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const now = new Date(); const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1)
            const start = new Date(now.setDate(diff)); const end = new Date(start)
            end.setDate(start.getDate() + 6)
            setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0])
          }}>
            <Table size={14} className="mr-1" /> Minggu Ini
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const end = new Date(now.getFullYear(), now.getMonth(), 0)
            setStartDate(start.toISOString().split('T')[0]); setEndDate(end.toISOString().split('T')[0])
          }}>
            <Table size={14} className="mr-1" /> Bulan Lalu
          </Button>
        </div>
      </Card>

      {result && (
        <Card title={`Preview: ${result.title} (${result.period})`}>
          {result.items.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Tidak ada data untuk periode ini</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200/80">
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">NIK</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Nama</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Departemen</th>
                    <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-gray-500 font-medium">Jabatan</th>
                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Hadir</th>
                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Terlambat</th>
                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Alpha</th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((emp, i) => (
                    <tr key={i} className="border-b border-gray-200/80 last:border-0">
                      <td className="px-3 py-2 text-gray-600">{emp.nik}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{emp.name}</td>
                      <td className="px-3 py-2 text-gray-600">{emp.department}</td>
                      <td className="px-3 py-2 text-gray-600">{emp.position}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="success">{emp.records.filter((r) => r.status === 'Hadir').length}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="warning">{emp.records.filter((r) => r.status === 'Terlambat').length}</Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant="danger">{emp.records.filter((r) => r.status === 'Alpha').length}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
