import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    console.error('Uncaught React Error in Admin Portal:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#11151D] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#202631] border border-white/10 p-8 rounded-3xl max-w-md w-full space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-red-500/20 text-red-400 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <h2 className="text-xl font-black text-white">Application Error Detected</h2>
            
            <p className="text-xs text-[#A8AFBA] leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred in the Admin Portal.'}
            </p>

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="w-full py-3 bg-[#35D0B0] text-[#11151D] font-extrabold text-xs rounded-xl flex items-center justify-center space-x-2 hover:brightness-110 active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Admin Control Center</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
