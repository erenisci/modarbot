import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Watchtower crashed:', error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-rose-300 p-6">
        <div className="max-w-md text-center flex flex-col gap-3">
          <div className="text-2xl">🛑</div>
          <div className="text-lg font-semibold">Watchtower crashed</div>
          <div className="text-sm text-rose-200/70 font-mono wrap-break-word">
            {error.message}
          </div>
          <button
            onClick={this.reset}
            className="mt-2 self-center text-sm px-4 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white font-medium"
          >
            Reload Watchtower
          </button>
        </div>
      </div>
    );
  }
}
