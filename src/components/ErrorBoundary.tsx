/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 */

'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Log to external service if configured
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.error('Production error:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold text-white mb-2">
                Something went wrong
              </h1>

              {/* Message */}
              <p className="text-zinc-400 mb-6">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>

              {/* Error details (dev mode only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-black/50 border border-red-900/50 rounded-lg text-left">
                  <div className="text-xs font-mono text-red-400 mb-2">
                    {this.state.error.name}: {this.state.error.message}
                  </div>
                  {this.state.error.stack && (
                    <div className="text-xs font-mono text-zinc-500 overflow-x-auto max-h-32 overflow-y-auto">
                      {this.state.error.stack}
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex-1 px-4 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-friendly error boundary wrapper
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
