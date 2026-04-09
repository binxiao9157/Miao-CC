import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center max-w-xs">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">😿</span>
            </div>
            <h2 className="text-xl font-black text-on-surface mb-2">哎呀，出错了</h2>
            <p className="text-sm text-on-surface-variant mb-6">
              页面遇到了一些问题，请尝试刷新。
            </p>
            <button
              onClick={this.handleReset}
              className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
