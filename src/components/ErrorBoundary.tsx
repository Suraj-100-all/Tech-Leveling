import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let displayMsg = error.message || 'An unexpected error occurred.';
    try {
      const parsed = JSON.parse(displayMsg) as { error?: string; operationType?: string; path?: string };
      if (parsed.error) {
        displayMsg = `Firestore ${parsed.operationType ?? 'operation'} failed on ${parsed.path ?? 'collection'}: ${parsed.error}`;
      }
    } catch {
      // Keep raw error message
    }
    return { hasError: true, message: displayMsg };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tech-Leveling ErrorBoundary caught:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#121212] px-4 text-[#F4F4F5]">
          <div className="w-full max-w-lg rounded-xl border border-[#F87171]/40 bg-[#18181B] p-8">
            <div className="flex items-center gap-3 text-[#FCA5A5]">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className="text-xl font-bold text-[#F4F4F5]">Application Recovery</h1>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[#D4D4D8]">{this.state.message}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.reload();
              }}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#FACC15] px-5 py-2.5 text-sm font-semibold text-[#0A0A0C] hover:bg-[#FDE047]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Reload Arena</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
