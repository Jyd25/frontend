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
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 14

  const addPageNumber = (pageNum: number) => {
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`Halaman ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
    doc.setTextColor(0)
  }

  let pageNum = 1

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('LAPORAN KEHADIRAN', pageWidth / 2, 15, { align: 'center' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Cahaya Rancamaya Islamic Boarding School', pageWidth / 2, 21, { align: 'center' })
  doc.text('Periode: ' + data.period, pageWidth / 2, 27, { align: 'center' })

  doc.setDrawColor(14, 165, 233)
  doc.setLineWidth(0.3)
  doc.line(margin, 30, pageWidth - margin, 30)

  let yOffset = 35

  for (const emp of data.items) {
    if (yOffset > pageHeight - 40) {
      addPageNumber(pageNum)
      doc.addPage()
      pageNum++
      yOffset = 15
    }

    doc.setFillColor(240, 249, 255)
    doc.roundedRect(margin, yOffset - 2, pageWidth - 2 * margin, 10, 1, 1, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`${emp.nik} — ${emp.name}`, margin + 3, yOffset + 3.5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(`Jabatan: ${emp.position}  |  Departemen: ${emp.department}`, margin + 3, yOffset + 7.5)
    yOffset += 13

    const hadir = emp.records.filter((r) => r.status === 'Hadir').length
    const terlambat = emp.records.filter((r) => r.status === 'Terlambat').length
    const alpha = emp.records.filter((r) => r.status === 'Alpha').length
    const pulangCepat = emp.records.filter((r) => r.status_checkout === 'Pulang Cepat').length

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(`Hadir: ${hadir}  |  Terlambat: ${terlambat}  |  Alpha: ${alpha}  |  Pulang Cepat: ${pulangCepat}`, margin + 3, yOffset + 4)
    yOffset += 7

    const rows = emp.records.map((r, i) => [
      i + 1,
      r.date,
      r.check_in,
      r.check_out,
      r.status,
      r.status_checkout || '-',
      (r.checkin_address && r.checkin_address !== '-' ? r.checkin_address.substring(0, 40) : '-'),
      (r.checkout_address && r.checkout_address !== '-' ? r.checkout_address.substring(0, 40) : '-'),
      r.face,
      r.remarks || '-',
    ])

    ;(doc as any).autoTable({
      startY: yOffset,
      head: [['No', 'Tanggal', 'Masuk', 'Pulang', 'Status', 'Status Pulang', 'Alamat Masuk', 'Alamat Pulang', 'Face', 'Keterangan']],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold', fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 16, halign: 'center' },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 42 },
        7: { cellWidth: 42 },
        8: { cellWidth: 14, halign: 'center' },
        9: { cellWidth: 30 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        addPageNumber(pageNum)
      },
    })

    yOffset = (doc as any).lastAutoTable.finalY + 10
  }

  if (pageNum === 1) addPageNumber(1)

  doc.save(`laporan-kehadiran-${data.period.replace(/\s/g, '')}.pdf`)
}

async function exportToExcel(data: ExportData) {
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()

  const rows: any[][] = [['No', 'NIK', 'Nama', 'Departemen', 'Jabatan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Status Pulang', 'Alamat Masuk', 'Alamat Pulang', 'Face', 'Keterangan']]
  let rowNum = 1
  for (const emp of data.items) {
    for (const r of emp.records) {
      rows.push([rowNum++, emp.nik, emp.name, emp.department, emp.position, r.date, r.check_in, r.check_out, r.status, r.status_checkout || '-', r.checkin_address || '-', r.checkout_address || '-', r.face, r.remarks || '-'])
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)

  ws['!cols'] = [
    { wch: 5 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 20 }, { wch: 35 }, { wch: 35 }, { wch: 8 }, { wch: 25 },
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
                    <th className="px-3 py-2 text-center text-[11px] uppercase tracking-wider text-gray-500 font-medium">Pulang Cepat</th>
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
                      <td className="px-3 py-2 text-center">
                        <Badge variant="warning">{emp.records.filter((r) => r.status_checkout === 'Pulang Cepat').length}</Badge>
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
