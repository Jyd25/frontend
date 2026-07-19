import Card from '@/components/ui/Card'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 text-center">Pengaturan</h1>

      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <Settings size={48} className="mb-4 text-gray-300" />
          <h2 className="text-[15px] font-semibold text-gray-600 mb-1">Pengaturan Aplikasi</h2>
          <p className="text-sm text-gray-400 text-center max-w-md">
            Halaman pengaturan sedang dalam pengembangan. Fitur pengaturan aplikasi akan tersedia di sini.
          </p>
        </div>
      </Card>
    </div>
  )
}
