import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ERROR BOUNDARY]', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-slate-50 flex
                      items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl
                        p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-2xl
                          flex items-center justify-center
                          mx-auto mb-4 text-3xl">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            An unexpected error occurred. Your data is safe.
            Try refreshing the page.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6
                          text-left">
            <p className="text-xs text-slate-400
                          font-mono break-all">
              {this.state.error?.message || 'Unknown error'}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-green-700 text-white
                         py-3 rounded-xl font-bold
                         hover:bg-green-800"
            >
              Refresh Page
            </button>
            <button
              onClick={() => this.setState({
                hasError: false, error: null,
              })}
              className="flex-1 border-2 border-slate-200
                         text-slate-600 py-3 rounded-xl
                         font-bold hover:bg-slate-50"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
