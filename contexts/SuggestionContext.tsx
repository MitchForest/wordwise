'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import type { UnifiedSuggestion, SuggestionAction } from '@/types/suggestions';
import { applyFixAtPosition } from '@/lib/editor/position-utils';

interface AppliedFix {
  suggestionId: string;
  fix: string;
  timestamp: number;
  position: { from: number; to: number };
}

interface SuggestionContextValue {
  // State
  suggestions: UnifiedSuggestion[];
  hiddenSuggestionIds: Set<string>;
  appliedFixes: Map<string, AppliedFix>;
  isApplyingFix: boolean;
  
  // Actions
  setSuggestions: (suggestions: UnifiedSuggestion[]) => void;
  applySuggestion: (editor: Editor, suggestion: UnifiedSuggestion, action: SuggestionAction) => Promise<void>;
  ignoreSuggestion: (suggestionId: string) => void;
  showAllSuggestions: () => void;
  undoLastFix: (editor: Editor) => void;
  
  // Computed
  visibleSuggestions: UnifiedSuggestion[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
}

const SuggestionContext = createContext<SuggestionContextValue | null>(null);

export function SuggestionProvider({ children }: { children: ReactNode }) {
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [hiddenSuggestionIds, setHiddenSuggestionIds] = useState<Set<string>>(new Set());
  const [appliedFixes, setAppliedFixes] = useState<Map<string, AppliedFix>>(new Map());
  const [isApplyingFix, setIsApplyingFix] = useState(false);

  // Computed values
  const visibleSuggestions = suggestions.filter(s => !hiddenSuggestionIds.has(s.id));
  const errorCount = visibleSuggestions.filter(s => s.severity === 'error').length;
  const warningCount = visibleSuggestions.filter(s => s.severity === 'warning').length;
  const infoCount = visibleSuggestions.filter(s => s.severity === 'info').length;

  /**
   * Apply a suggestion fix to the editor
   */
  const applySuggestion = useCallback(async (
    editor: Editor,
    suggestion: UnifiedSuggestion,
    action: SuggestionAction
  ) => {
    if (isApplyingFix) return;
    
    setIsApplyingFix(true);
    
    try {
      // Handle different action types
      if (action.type === 'fix' && action.value) {
        const result = await applyFixAtPosition(editor, suggestion, action.value);
        
        if (result.success) {
          // Record the fix for potential undo
          const fixRecord: AppliedFix = {
            suggestionId: suggestion.id,
            fix: action.value,
            timestamp: Date.now(),
            position: { from: 0, to: 0 }, // Will be updated with actual position
          };
          
          setAppliedFixes(prev => new Map(prev).set(suggestion.id, fixRecord));
          
          // Remove the suggestion from the list
          setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
          
          // Show success feedback
          toast.success('Fix applied successfully', {
            description: `${suggestion.category}: ${action.label}`,
            duration: 2000,
          });
        } else {
          // Show error feedback
          toast.error('Failed to apply fix', {
            description: result.error || 'Please try applying the fix manually.',
            duration: 4000,
          });
        }
      } else if (action.handler) {
        // Custom handler (for complex fixes)
        await action.handler();
        
        // Remove the suggestion if handler succeeded
        setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
        
        toast.success('Action completed', {
          description: action.label,
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('An error occurred', {
        description: 'Please try again or apply the fix manually.',
        duration: 4000,
      });
    } finally {
      setIsApplyingFix(false);
    }
  }, [isApplyingFix]);

  /**
   * Ignore a suggestion (hide it from view)
   */
  const ignoreSuggestion = useCallback((suggestionId: string) => {
    setHiddenSuggestionIds(prev => {
      const next = new Set(prev);
      next.add(suggestionId);
      return next;
    });
    
    const suggestion = suggestions.find(s => s.id === suggestionId);
    if (suggestion) {
      toast.info('Suggestion ignored', {
        description: 'You can show all hidden suggestions from the panel.',
        duration: 2000,
      });
    }
  }, [suggestions]);

  /**
   * Show all hidden suggestions
   */
  const showAllSuggestions = useCallback(() => {
    const hiddenCount = hiddenSuggestionIds.size;
    setHiddenSuggestionIds(new Set());
    
    if (hiddenCount > 0) {
      toast.success(`Restored ${hiddenCount} hidden suggestion${hiddenCount > 1 ? 's' : ''}`, {
        duration: 2000,
      });
    }
  }, [hiddenSuggestionIds.size]);

  /**
   * Undo the last applied fix
   */
  const undoLastFix = useCallback((editor: Editor) => {
    const lastFix = Array.from(appliedFixes.values())
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    if (!lastFix) {
      toast.info('No fixes to undo', {
        duration: 2000,
      });
      return;
    }

    // For now, just show a message. Full undo implementation would require
    // storing the original text and position
    toast.info('Undo functionality coming soon', {
      description: 'Use Ctrl/Cmd+Z in the editor for now.',
      duration: 3000,
    });
    
    // Remove from applied fixes
    setAppliedFixes(prev => {
      const next = new Map(prev);
      next.delete(lastFix.suggestionId);
      return next;
    });
  }, [appliedFixes]);

  const value: SuggestionContextValue = {
    // State
    suggestions,
    hiddenSuggestionIds,
    appliedFixes,
    isApplyingFix,
    
    // Actions
    setSuggestions,
    applySuggestion,
    ignoreSuggestion,
    showAllSuggestions,
    undoLastFix,
    
    // Computed
    visibleSuggestions,
    errorCount,
    warningCount,
    infoCount,
  };

  return (
    <SuggestionContext.Provider value={value}>
      {children}
    </SuggestionContext.Provider>
  );
}

export function useSuggestions() {
  const context = useContext(SuggestionContext);
  if (!context) {
    throw new Error('useSuggestions must be used within a SuggestionProvider');
  }
  return context;
}