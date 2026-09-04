import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: unknown) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-2xl font-bold">!</div>
          <p className="text-sm font-medium text-gray-800">Terjadi kesalahan pada tampilan.</p>
          <p className="text-xs text-gray-500 max-w-sm">Silakan muat ulang halaman. Jika tetap terjadi, hubungi administrator.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-1 px-4 py-2 rounded-lg gradient-primary text-white text-sm font-semibold shadow-md shadow-sky-500/20 hover:opacity-90 transition-opacity"
          >
            Muat Ulang
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
