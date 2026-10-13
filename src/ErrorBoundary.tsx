import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-rose-400">Algo salió mal al cargar la aplicación</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded-lg overflow-auto max-h-32 text-left">
              {this.state.error?.message || 'Error desconocido'}
            </p>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/pos';
              }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Reiniciar aplicación y limpiar caché
            </button>
          </div>
        </div>
      );
    }

    return this.children ? (this.children as any) : this.props.children;
  }
}
