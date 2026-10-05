import React from 'react';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/?view=kiosk';
  };

  render() {
    if (this.state.hasError) {
      const isNetwork = this.state.error?.message?.toLowerCase().includes('fetch') ||
                        this.state.error?.message?.toLowerCase().includes('network');

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0a09',
          color: '#f5f5f4',
          padding: '24px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: '#1c1917',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '32px 28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isNetwork ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: isNetwork ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              {isNetwork ? (
                <WifiOff size={30} color="#ef4444" />
              ) : (
                <AlertTriangle size={30} color="#f59e0b" />
              )}
            </div>

            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
              {isNetwork ? 'Network Connection Error' : 'Interface Service Interrupted'}
            </h2>

            <p style={{ fontSize: '13.5px', color: '#a8a29e', lineHeight: '1.5', marginBottom: '20px' }}>
              The system encountered an unexpected issue while rendering this dining view. You can retry the connection or reload the active interface.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '10px 14px',
                textAlign: 'left',
                marginBottom: '24px',
                maxHeight: '120px',
                overflowY: 'auto'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#f87171', fontFamily: 'monospace' }}>
                  {this.state.error.toString()}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #e45729 0%, #c24522 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(228, 87, 41, 0.3)'
                }}
              >
                <RefreshCw size={15} />
                <span>Retry Connection</span>
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e7e5e4',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Home size={15} />
                <span>Return to Kiosk</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
