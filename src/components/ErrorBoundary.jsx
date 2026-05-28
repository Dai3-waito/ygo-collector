import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-100">
          <div className="max-w-lg rounded-2xl border border-red-400/40 bg-zinc-900 p-6">
            <h1 className="text-xl font-bold text-red-200">エラーが発生しました</h1>
            <p className="mt-3 text-sm text-zinc-300">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg border border-amber-300/40 px-4 py-2 text-sm text-amber-100 hover:bg-amber-300/10"
            >
              再読み込み
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
