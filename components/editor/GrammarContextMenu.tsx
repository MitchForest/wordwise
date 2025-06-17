import * as React from 'react';
import { Check, X, Plus } from 'lucide-react';
import type { GrammarError } from '@/types/suggestions';

interface GrammarContextMenuProps {
  error: GrammarError | null;
  position: { x: number; y: number } | null;
  onApplyFix: (replacement: string) => void;
  onIgnore: () => void;
  onAddToDictionary: () => void;
}

export function GrammarContextMenu({
  error,
  position,
  onApplyFix,
  onIgnore,
  onAddToDictionary,
}: GrammarContextMenuProps) {
  if (!error || !position) return null;

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-lg border p-2 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <div className="text-sm font-medium text-gray-900 px-2 py-1 mb-1">
        {error.message}
      </div>
      
      <div className="border-t pt-1">
        {error.replacements.slice(0, 3).map((replacement, index) => (
          <button
            key={index}
            onClick={() => onApplyFix(replacement.value)}
            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <Check className="h-3 w-3 text-green-600" />
            {replacement.value}
          </button>
        ))}
      </div>
      
      <div className="border-t mt-1 pt-1">
        <button
          onClick={onIgnore}
          className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
        >
          <X className="h-3 w-3 text-gray-400" />
          Ignore
        </button>
        
        {error.severity === 'critical' && (
          <button
            onClick={onAddToDictionary}
            className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
          >
            <Plus className="h-3 w-3 text-gray-400" />
            Add to dictionary
          </button>
        )}
      </div>
    </div>
  );
} 