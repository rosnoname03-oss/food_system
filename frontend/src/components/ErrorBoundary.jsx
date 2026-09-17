import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error caught by boundary:', error, errorInfo)
  }

  handleReload = () => {
    try {
      localStorage.removeItem('cached_menu_categories')
      localStorage.removeItem('cached_menu_items')
      localStorage.removeItem('cached_menu_banners')
    } catch {
      // ignore
    }
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-3xl mx-auto mb-4">
              ☕
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mb-2">
              Something went wrong
            </h2>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              We encountered a temporary display issue. Tap below to reload the menu with fresh data.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full py-3 px-6 bg-gradient-to-r from-orange-600 to-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Refresh & Reload Menu
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
