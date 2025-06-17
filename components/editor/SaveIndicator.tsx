'use client';

export type SaveState = 'saved' | 'saving' | 'error';

interface SaveIndicatorProps {
  state: SaveState;
  className?: string;
}

export function SaveIndicator({ state, className = '' }: SaveIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {state === 'saved' && (
        <>
          <div className="h-2 w-2 rounded-full bg-green-600" />
          <span className="text-green-600">All changes saved</span>
        </>
      )}
      {state === 'saving' && (
        <>
          <div className="h-2 w-2 rounded-full bg-yellow-600 animate-pulse" />
          <span className="text-yellow-600">Saving...</span>
        </>
      )}
      {state === 'error' && (
        <>
          <div className="h-2 w-2 rounded-full bg-red-600" />
          <span className="text-red-600">Error saving changes</span>
        </>
      )}
    </div>
  );
} 