/**
 * @file contexts/SuggestionContext.tsx
 * @purpose This context acts as the central hub for sharing analysis results between the
 * `useUnifiedAnalysis` hook (which produces suggestions and metrics) and the various UI
 * components that display them (like `EnhancedSuggestionsPanel` and `EditorStatusBar`).
 * It also manages the filter state for the suggestions list.
 * @modified 2024-12-28 - Added text-based suggestion cleanup
 */
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useRef, useEffect } from 'react';
import type { UnifiedSuggestion } from '@/types/suggestions';
import type { DocumentMetrics } from '@/services/analysis/engine';

interface EditorActions {
  apply: (suggestionId: string, value: string) => void;
  getDocumentText?: () => string; // NEW: for text-based cleanup
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
  getSuggestions: () => UnifiedSuggestion[];
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
  const suggestionsRef = useRef<UnifiedSuggestion[]>([]);

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

  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  const getSuggestions = useCallback(() => {
    return suggestionsRef.current;
  }, []);

  const updateSuggestions = useCallback(
    (categories: string[], newSuggestionsFromServer: UnifiedSuggestion[]) => {
      console.log('[SuggestionContext] Received suggestions from server:', {
        categories,
        count: newSuggestionsFromServer.length,
        suggestions: newSuggestionsFromServer.map(s => ({
          id: s.id,
          category: s.category,
          matchText: s.matchText,
          position: s.position,
          message: s.message
        }))
      });
      
      setSuggestions(prevSuggestions => {
        // Get current document text if available
        const documentText = editorActions?.getDocumentText?.() || '';
        
        console.log('[SuggestionContext] Document text:', {
          hasText: !!documentText,
          length: documentText.length,
          preview: documentText.substring(0, 100) + '...',
          editorReady: !!editorActions
        });
        
        // Filter existing suggestions by categories that are NOT being updated
        // This ensures we don't keep stale suggestions from categories being refreshed
        const categoriesSet = new Set(categories);
        const retainedSuggestions = prevSuggestions.filter(s => !categoriesSet.has(s.category));
        
        // Combine retained suggestions with new ones
        const combinedSuggestions = [...retainedSuggestions, ...newSuggestionsFromServer];
        
        // De-duplicate by ID
        const uniqueMap = new Map<string, UnifiedSuggestion>();
        combinedSuggestions.forEach(s => uniqueMap.set(s.id, s));
        const finalList = Array.from(uniqueMap.values());
        
        console.log('[SuggestionContext] Updated suggestions:', {
          previous: prevSuggestions.length,
          new: newSuggestionsFromServer.length,
          retained: retainedSuggestions.length,
          final: finalList.length,
          byCategory: finalList.reduce((acc, s) => {
            acc[s.category] = (acc[s.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });

        return finalList;
      });
    },
    [editorActions],
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
        getSuggestions,
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