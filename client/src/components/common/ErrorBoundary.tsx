import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render/runtime errors anywhere below it and shows a recovery screen
 * instead of leaving the user staring at a blank white page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Nieobsłużony błąd interfejsu:', error, info);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl dark:bg-red-900/30">
            ⚠️
          </div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Coś poszło nie tak</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Wystąpił nieoczekiwany błąd. Odśwież stronę — jeśli problem się powtarza, skontaktuj się z działem IT.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F7941D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e0850f]"
          >
            Odśwież stronę
          </button>
        </div>
      </div>
    );
  }
}
