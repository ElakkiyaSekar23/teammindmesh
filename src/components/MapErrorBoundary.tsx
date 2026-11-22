import React, { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { RingLoader } from './RingMotif';

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  title?: string;
  retryLabel?: string;
  heightClass?: string;
}

interface MapErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  state: MapErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  static getDerivedStateFromError(error: Error): MapErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Could not load this visual.',
    };
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className={`instrument-panel flex flex-col items-center justify-center gap-3 p-6 text-center ${
            this.props.heightClass ?? 'min-h-[300px]'
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--ember)]/15 text-[var(--ember)]">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="max-w-md space-y-1">
            <p className="text-sm font-semibold text-[var(--text)]">
              {this.props.title ?? 'Could not load the map view'}
            </p>
            <p className="text-xs text-[var(--muted)]">{this.state.message}</p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--amber)] focus-visible:outline-2 focus-visible:outline-[var(--amber)]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {this.props.retryLabel ?? 'Try again'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function MapLoadingFallback({
  label = 'Loading map view...',
  heightClass = 'min-h-[320px]',
}: {
  label?: string;
  heightClass?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`instrument-panel instrument-ticks flex flex-col items-center justify-center gap-3 p-6 text-center ${heightClass}`}
    >
      <RingLoader label={label} />
    </div>
  );
}
