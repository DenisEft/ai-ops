import { createElement } from 'react'
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('[ERROR_BOUNDARY]', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-900/20 border border-red-800 rounded-xl">
          <div className="text-red-400 font-bold mb-2">❌ Ошибка компонента</div>
          <pre className="text-xs text-red-300 whitespace-pre-wrap font-mono">{this.state.error?.message || String(this.state.error)}</pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="mt-3 px-3 py-1 bg-red-800 hover:bg-red-700 text-white rounded text-xs"
          >
            🔄 Перезагрузить
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
