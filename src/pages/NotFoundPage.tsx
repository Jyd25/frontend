import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="text-gray-500 mt-2 text-sm">Halaman tidak ditemukan</p>
        <Link to="/dashboard"><Button className="mt-4">Kembali ke Dashboard</Button></Link>
      </div>
    </div>
  )
}
