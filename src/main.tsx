import React, { StrictMode, Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerTacticalServiceWorker } from './registerServiceWorker';

// Intercept benign Firebase Auth & Firestore offline notices in preview iframes and sandbox environments
if (typeof window !== 'undefined') {
  // 1. Intercept console.error for benign Firestore offline-mode notices
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const fullMsg = args.map((a) => (a instanceof Error ? a.message : String(a || ''))).join(' ');
    if (
      fullMsg.includes('Could not reach Cloud Firestore backend') ||
      fullMsg.includes("Backend didn't respond within 10 seconds") ||
      fullMsg.includes('client will operate in offline mode') ||
      fullMsg.includes('the client is offline') ||
      fullMsg.includes('auth/network-request-failed')
    ) {
      console.warn('[AWIS Sandbox Shield] Firestore operating in offline-first mode:', fullMsg);
      return;
    }
    originalConsoleError.apply(console, args);
  };

  // 2. Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '');
    const code = String(reason?.code || '');
    if (
      msg.includes('auth/network-request-failed') ||
      msg.includes('network-request-failed') ||
      msg.includes('the client is offline') ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      code === 'auth/network-request-failed' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/popup-blocked' ||
      code === 'auth/unauthorized-domain' ||
      code === 'auth/cancelled-popup-request'
    ) {
      console.warn('[AWIS Sandbox Shield] Caught and handled background network/sandbox event:', code || msg);
      event.preventDefault();
    }
  });

  // 3. Intercept global window errors
  window.addEventListener('error', (event) => {
    const msg = String(event.message || event.error?.message || '');
    const code = String(event.error?.code || '');
    if (
      msg.includes('auth/network-request-failed') ||
      msg.includes('network-request-failed') ||
      msg.includes('the client is offline') ||
      msg.includes('Could not reach Cloud Firestore backend') ||
      code === 'auth/network-request-failed'
    ) {
      console.warn('[AWIS Sandbox Shield] Intercepted window network notice:', code || msg);
      event.preventDefault();
    }
  });
}

// Initialize Tactical PWA Service Worker (with iframe sandbox guard)
registerTacticalServiceWorker().catch(() => {});

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

