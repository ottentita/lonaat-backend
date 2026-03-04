import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

/**
 * Error Boundary Component
 * Catches React component errors and displays fallback UI
 * Logs errors for debugging and monitoring
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log error details
    console.error('Error caught by boundary:', error);
    console.error('Error Info:', errorInfo);

    // Send to error tracking service (Sentry, etc.)
    if (window.__logError) {
      window.__logError({
        message: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.MODE === 'development';

      return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-dark-800 border-dark-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
                <CardTitle className="text-red-500">Something went wrong</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-dark-300">
                An unexpected error occurred. Our team has been notified and we're working on a fix.
              </p>

              {isDev && this.state.error && (
                <div className="bg-dark-900 rounded p-4 space-y-2">
                  <p className="text-sm font-semibold text-dark-100">Error Details (Development Only)</p>
                  <p className="text-sm text-red-400 font-mono break-words">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer text-dark-300 hover:text-dark-200">
                        View Stack Trace
                      </summary>
                      <pre className="text-xs text-dark-400 mt-2 overflow-auto max-h-48 whitespace-pre-wrap break-words">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 bg-primary-500 hover:bg-primary-600"
                >
                  Try Again
                </Button>
                <Button
                  onClick={this.handleReload}
                  variant="outline"
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </Button>
              </div>

              {this.state.errorCount > 3 && (
                <p className="text-sm text-yellow-500">
                  ⚠️ Multiple errors detected. Please try clearing your browser cache or contact support if the problem persists.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
