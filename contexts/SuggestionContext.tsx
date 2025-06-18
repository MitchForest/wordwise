/**
 * @file contexts/SuggestionContext.tsx
 * @purpose This context acts as the central hub for sharing analysis results between the
 * `useUnifiedAnalysis` hook (which produces suggestions and metrics) and the various UI
 * components that display them (like `EnhancedSuggestionsPanel` and `EditorStatusBar`).
 * It also manages the filter state for the suggestions list.
 */
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef, useEffect } from 'react';
import type { UnifiedSuggestion } from '@/types/suggestions';
import type { DocumentMetrics } from '@/services/analysis/engine';

interface EditorActions {
  apply: (suggestionId: string, value: string) => void;
}

interface SuggestionFilter {
  categories: string[];
}

interface SuggestionContextType {
  suggestions: UnifiedSuggestion[];
  visibleSuggestions: UnifiedSuggestion[];
  metrics: DocumentMetrics | null;
  filter: SuggestionFilter;
  hoveredSuggestionId: string | null;
  focusedSuggestionId: string | null;
  setMetrics: (metrics: Partial<DocumentMetrics> | null) => void;
  setFilter: (filter: SuggestionFilter) => void;
  setHoveredSuggestionId: (id: string | null) => void;
  setFocusedSuggestionId: (id: string | null) => void;
  registerEditorActions: (actions: EditorActions) => void;
  applySuggestion: (suggestionId: string, value: string) => void;
  ignoreSuggestion: (suggestionId: string) => void;
  updateSuggestions: (categories: string[], newSuggestionsFromServer: UnifiedSuggestion[]) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export const SuggestionProvider = ({ children }: { children: ReactNode }) => {
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [metrics, setMetricsState] = useState<DocumentMetrics | null>(null);
  const [filter, setFilter] = useState<SuggestionFilter>({ categories: ['spelling', 'grammar', 'style', 'seo'] });
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null);
  const [focusedSuggestionId, setFocusedSuggestionId] = useState<string | null>(null);
  const [editorActions, setEditorActions] = useState<EditorActions | null>(null);
  const [reconciliationActive, setReconciliationActive] = useState(false);
  const pendingSuggestions = useRef<UnifiedSuggestion[]>([]);
  const reconciliationTimer = useRef<NodeJS.Timeout | null>(null);

  const setMetrics = useCallback((newMetrics: Partial<DocumentMetrics> | null) => {
    if (newMetrics === null) {
      setMetricsState(null);
      return;
    }
    setMetricsState(prevMetrics => ({
      ...(prevMetrics || {}),
      ...newMetrics,
    } as DocumentMetrics));
  }, []);

  useEffect(() => {
    // When the reconciliation window closes, add any pending suggestions.
    if (!reconciliationActive && pendingSuggestions.current.length > 0) {
      setSuggestions(prev => [...prev, ...pendingSuggestions.current]);
      pendingSuggestions.current = [];
    }
  }, [reconciliationActive]);

  const updateSuggestions = useCallback(
    (_categories: string[], newSuggestionsFromServer: UnifiedSuggestion[]) => {
      setSuggestions(prevSuggestions => {
        // Create a set of existing IDs to prevent React duplicate key errors
        const existingIds = new Set(prevSuggestions.map(s => s.id));
        
        // Filter out any new suggestions that would create duplicate IDs
        const filteredNew = newSuggestionsFromServer.filter(s => !existingIds.has(s.id));
        
        // --- 1. Combine & Conquer ---
        // Combine the existing suggestions with the filtered new ones
        const combinedList = [...prevSuggestions, ...filteredNew];

        // --- 2. De-duplicate with a "First-In Wins" Strategy ---
        // Use a Map to ensure that for any given error (defined by its position
        // and rule), only the first suggestion encountered is kept.
        const suggestionMap = new Map<string, UnifiedSuggestion>();

        for (const suggestion of combinedList) {
          // A robust key is the error's position plus the specific rule that triggered it.
          const key = `${suggestion.position?.start}-${suggestion.position?.end}-${suggestion.ruleId}`;
          
          // If this key hasn't been seen yet, it's the first one, so we keep it.
          // This ensures faster checks (like real-time spellcheck) are not
          // overwritten by slower, debounced checks.
          if (!suggestionMap.has(key)) {
            suggestionMap.set(key, suggestion);
          }
        }
        
        // --- 3. Create Final State ---
        // Convert the de-duplicated map back into an array.
        let finalList = Array.from(suggestionMap.values());
        
        // --- 4. Authoritative Sort ---
        // Sort the final list by position in the document. Any suggestion
        // without a position (like document-wide SEO tips) is treated as
        // having an infinite position, automatically pushing it to the bottom.
        finalList.sort((a, b) => {
          const aPos = a.position?.start ?? Infinity;
          const bPos = b.position?.start ?? Infinity;
          return aPos - bPos;
        });

        // The reconciliation logic for applied suggestions could be refined here,
        // but this core logic fixes the primary bugs of disappearing and
        // mis-ordered suggestions.
        if (reconciliationActive) {
            // During the reconciliation window, we still want to apply this logic
            // to prevent the UI from reverting to a bad state.
        }

        return finalList;
      });
    },
    [reconciliationActive],
  );

  const registerEditorActions = useCallback((actions: EditorActions) => {
    setEditorActions(actions);
  }, []);

  const applySuggestion = useCallback(
    (suggestionId: string, value: string) => {
      if (editorActions) {
        editorActions.apply(suggestionId, value);
        setSuggestions(prev => prev.filter(s => s.id !== suggestionId));

        // Open the reconciliation window.
        setReconciliationActive(true);

        if (reconciliationTimer.current) {
          clearTimeout(reconciliationTimer.current);
        }

        reconciliationTimer.current = setTimeout(() => {
          setReconciliationActive(false);
          reconciliationTimer.current = null;
        }, 3000); // Reconciliation window is 3 seconds long.
      }
    },
    [editorActions],
  );

  const ignoreSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const visibleSuggestions = useMemo(() => {
    return filter.categories.length === 0
      ? suggestions
      : suggestions.filter(s => filter.categories.includes(s.category));
  }, [suggestions, filter]);

  return (
    <SuggestionContext.Provider
      value={{
        suggestions,
        visibleSuggestions,
        metrics,
        filter,
        hoveredSuggestionId,
        focusedSuggestionId,
        setMetrics,
        setFilter,
        setHoveredSuggestionId,
        setFocusedSuggestionId,
        registerEditorActions,
        applySuggestion,
        ignoreSuggestion,
        updateSuggestions,
      }}
    >
      {children}
    </SuggestionContext.Provider>
  );
};

export const useSuggestions = () => {
  const context = useContext(SuggestionContext);
  if (!context) {
    throw new Error('useSuggestions must be used within a SuggestionProvider');
  }
  return context;
};