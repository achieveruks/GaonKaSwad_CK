import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: any): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 sm:p-8 border border-stone-200 shadow-xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-stone-900">Something went wrong</h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              The application encountered a temporary display issue. You can return to the home screen.
            </p>
            {this.state.errorMessage && (
              <div className="p-3 bg-stone-100 rounded-xl text-left font-mono text-[11px] text-stone-700 break-all max-h-24 overflow-y-auto">
                {this.state.errorMessage}
              </div>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, errorMessage: '' });
                window.location.hash = '#/';
              }}
              className="w-full py-3 px-4 rounded-xl bg-amber-800 hover:bg-amber-900 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }

    return (this.props as any).children;
  }
}
