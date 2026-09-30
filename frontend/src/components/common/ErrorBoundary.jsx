import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CropShield ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

      return (
        <div className="page-shell" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
          <div className="cs-error-state" role="alert" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div className="cs-error-icon-box">
              <AlertCircle size={28} />
            </div>

            <h1 className="cs-error-title" style={{ fontSize: '20px' }}>
              Something went wrong in CropShield
            </h1>

            <p className="cs-error-message">
              The application encountered an unexpected issue while rendering this view. You can reload
              the page or try resetting the view.
            </p>

            <div className="flex-center gap-3 mt-3">
              <Button variant="primary" size="sm" onClick={this.handleReload} icon={RefreshCw}>
                Reload Application
              </Button>
              <Button variant="secondary" size="sm" onClick={this.handleReset}>
                Dismiss & Continue
              </Button>
            </div>

            {isDev && this.state.error && (
              <div className="cs-error-dev" style={{ textAlign: 'left', marginTop: '20px', width: '100%' }}>
                <strong>Technical Error Details (DEV only):</strong>
                <pre style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap', fontSize: '11px' }}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
