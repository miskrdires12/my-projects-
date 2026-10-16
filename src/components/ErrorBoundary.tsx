import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

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
    console.error('Uncaught error in StudentBridge UI:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.removeItem('sb_custom_students');
    } catch (e) {}
    window.location.href = '/receiver/students';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B1118] text-[#F1F5F9] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#131E2B] border border-[#1E2D3D] rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#85E510]/10 border border-[#85E510]/30 flex items-center justify-center mx-auto text-[#85E510]">
              <AlertTriangle className="w-7 h-7" />
            </div>
            
            <div>
              <h2 className="text-xl font-heading font-black text-white">
                Display Recovery Protected
              </h2>
              <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                StudentBridge encountered a temporary rendering interruption. All your database and Cloudflare records remain safe.
              </p>
              {this.state.error?.message && (
                <div className="mt-3 p-2.5 bg-[#0B1118] border border-[#1E2D3D] rounded-xl text-[11px] font-mono text-rose-400 text-left overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2.5 rounded-xl bg-[#85E510] hover:bg-[#76CF0C] text-[#062404] text-xs font-black transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2.5 rounded-xl bg-[#1A2634] hover:bg-[#223244] border border-[#2B3B4E] text-[#94A3B8] hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Return to Directory</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
