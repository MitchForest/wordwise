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
    (categories: string[], newSuggestionsFromServer: UnifiedSuggestion[]) => {
      setSuggestions(prevSuggestions => {
        const newSuggestionsMap = new Map(newSuggestionsFromServer.map(s => [s.id, s]));
        const intermediateList: UnifiedSuggestion[] = [];
        const updatedSuggestionIds = new Set<string>();

        // Iterate through the previous list to build the new list, preserving order.
        for (const prev of prevSuggestions) {
          if (categories.includes(prev.category)) {
            const updated = newSuggestionsMap.get(prev.id);
            if (updated) {
              intermediateList.push(updated);
              updatedSuggestionIds.add(updated.id);
            }
          } else {
            intermediateList.push(prev);
          }
        }

        // A truly new suggestion is one from the server that we didn't just use as an update.
        const trulyNewSuggestions = newSuggestionsFromServer.filter(s => !updatedSuggestionIds.has(s.id));

        if (reconciliationActive) {
          if (trulyNewSuggestions.length > 0) {
            pendingSuggestions.current.push(...trulyNewSuggestions);
          }
          return intermediateList;
        } else {
          return [...intermediateList, ...trulyNewSuggestions];
        }
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