import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, FileText, Table } from 'lucide-react'
import { exportService, type ExportData } from '@/services/leave-correction.service'
import { departmentService } from '@/services/department.service'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

function exportToCSV(data: ExportData) {
  const rows: string[] = []
  rows.push(['NIK', 'Nama', 'Departemen', 'Jabatan', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Lokasi', 'Face'].join(','))
  for (const emp of data.items) {
    for (const r of emp.records) {
      rows.push([emp.nik, emp.name, emp.department, emp.position, r.date, r.check_in, r.check_out, r.status, r.location, r.face].join(','))
    }
  }
  const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-kehadiran-${data.period.replace(/\s/g, '')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportToHTML(data: ExportData) {
  let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Laporan Kehadiran</title>
  <style>
    body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
    h1{text-align:center;font-size:18px;margin-bottom:4px}
    h2{text-align:center;font-size:14px;color:#666;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
    th{background:linear-gradient(135deg,#0ea5e9,#0d9488);color:white;font-weight:600}
    tr:nth-child(even){background:#f9f9f9}
    .emp-header{background:#f3f4f6;padding:8px 12px;font-weight:700;font-size:13px;border:1px solid #ddd}
    @media print{body{padding:10px}}
  </style></head><body>
  <h1>${data.title}</h1><h2>Periode: ${data.period}</h2>`

  for (const emp of data.items) {
    html += `<div class="emp-header">${emp.nik} - ${emp.name} (${emp.department} / ${emp.position})</div>`
    html += '<table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Pulang</th><th>Status</th><th>Lokasi</th><th>Face</th></tr></thead><tbody>'
    for (const r of emp.records) {
      html += `<tr><td>${r.date}</td><td>${r.check_in}</td><td>${r.check_out}</td><td>${r.status}</td><td>${r.location}</td><td>${r.face}</td></tr>`
    }
    html += '</tbody></table>'
  }

  html += '</body></html>'
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `laporan-kehadiran-${data.period.replace(/\s/g, '')}.html`
  a.click()
  URL.revokeObjectURL(url)
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

  const handleExport = async (format: 'csv' | 'html') => {
    if (!startDate || !endDate) return
    try {
      const data = await exportService.getAttendance({
        start_date: startDate,
        end_date: endDate,
        department_id: deptId ? Number(deptId) : undefined,
        format,
      })
      setResult(data)
      if (format === 'csv') exportToCSV(data)
      else exportToHTML(data)
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
            <Button onClick={() => handleExport('csv')} disabled={!startDate || !endDate}>
              <Download size={14} className="mr-1" /> CSV
            </Button>
            <Button onClick={() => handleExport('html')} disabled={!startDate || !endDate} variant="outline">
              <FileText size={14} className="mr-1" /> Print
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick presets */}
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

      {/* Preview */}
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
