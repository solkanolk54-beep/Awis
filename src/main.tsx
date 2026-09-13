import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './services/offlineCacheService';

// Initialize Service Worker cleanup / cache protection
registerServiceWorker().catch(() => {});

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AWIS Application Boundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    try {
      const anyWin = window as any;
      if (anyWin?.caches) {
        anyWin.caches.keys().then((keys: string[]) => {
          return Promise.all(keys.map((k: string) => anyWin.caches.delete(k)));
        }).finally(() => {
          anyWin.location.reload();
        });
      } else {
        anyWin.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center text-xl font-bold">
              AWIS
            </div>
            <h1 className="text-lg font-bold text-white">نظام الرصد الذكي — استعادة الجلسة</h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              حدث خطأ مؤقت في تحميل الواجهة. تم تنظيف ذاكرة التخزين المؤقت لضمان استقرار الاتصال.
            </p>
            {this.state.error && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-left text-[11px] text-red-400 font-mono overflow-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              إعادة التحميل وتحديث البيانات | Reload System
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);

