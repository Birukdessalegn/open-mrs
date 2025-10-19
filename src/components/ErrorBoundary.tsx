/**
 * Error Boundary component for handling React errors gracefully
 * Provides user-friendly error messages and recovery options
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
}

function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl text-red-900">Something went wrong</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600 text-center">
            We're sorry, but something unexpected happened. Please try again or contact support if the problem persists.
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="bg-slate-100 p-3 rounded text-sm">
              <summary className="cursor-pointer font-medium">Error Details</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {error.message}
                {error.stack}
              </pre>
            </details>
          )}

          <div className="flex gap-2">
            <Button onClick={onRetry} className="flex-1 gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button variant="outline" onClick={handleGoHome} className="flex-1 gap-2">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook for error handling in functional components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    console.error('Error caught by useErrorHandler:', error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  React.useEffect(() => {
    if (error) {
      // You can add error reporting service here
      // Example: errorReportingService.reportError(error);
    }
  }, [error]);

  return {
    error,
    handleError,
    clearError,
  };
}

/**
 * Higher-order component for error handling
 */
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  errorMessage?: string
) {
  return function WithErrorHandlingComponent(props: P) {
    const { error, handleError, clearError } = useErrorHandler();

    if (error) {
      return (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">
              {errorMessage || 'An error occurred'}
            </span>
          </div>
          <p className="text-red-600 text-sm mt-1">{error.message}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={clearError}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      );
    }

    return <Component {...props} onError={handleError} />;
  };
}
