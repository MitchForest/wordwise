/**
 * @file contexts/SuggestionContext.tsx
 * @purpose This context acts as the central hub for sharing analysis results between the
 * `useUnifiedAnalysis` hook (which produces suggestions and metrics) and the various UI
 * components that display them (like `EnhancedSuggestionsPanel` and `EditorStatusBar`).
 * It also manages the filter state for the suggestions list.
 */
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
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
  filteredSuggestions: UnifiedSuggestion[];
  metrics: DocumentMetrics | null;
  filter: SuggestionFilter;
  hoveredSuggestionId: string | null;
  setSuggestions: (suggestions: UnifiedSuggestion[]) => void;
  addSuggestions: (newSuggestions: UnifiedSuggestion[]) => void;
  setMetrics: (metrics: DocumentMetrics | null) => void;
  setFilter: (filter: SuggestionFilter) => void;
  setHoveredSuggestionId: (id: string | null) => void;
  registerEditorActions: (actions: EditorActions) => void;
  applySuggestion: (suggestionId: string, value: string) => void;
  ignoreSuggestion: (suggestionId: string) => void;
  replaceSuggestionsByCategories: (categories: string[], newSuggestions: UnifiedSuggestion[]) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export const SuggestionProvider = ({ children }: { children: ReactNode }) => {
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [metrics, setMetrics] = useState<DocumentMetrics | null>(null);
  const [filter, setFilter] = useState<SuggestionFilter>({ categories: [] });
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null);
  const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

  const addSuggestions = useCallback((newSuggestions: UnifiedSuggestion[]) => {
    setSuggestions(prevSuggestions => {
      const newSuggestionsMap = new Map(newSuggestions.map(s => [s.id, s]));
      
      // Filter out old suggestions that are being replaced by new ones
      const filteredOldSuggestions = prevSuggestions.filter(
        oldSuggestion => !newSuggestionsMap.has(oldSuggestion.id)
      );

      return [...filteredOldSuggestions, ...newSuggestions];
    });
  }, []);

  const replaceSuggestionsByCategories = useCallback((categories: string[], newSuggestions: UnifiedSuggestion[]) => {
    setSuggestions(prevSuggestions => {
      // Filter out suggestions that belong to the specified categories
      const remainingSuggestions = prevSuggestions.filter(
        suggestion => !categories.includes(suggestion.category)
      );
      // Return the remaining suggestions plus the new ones
      return [...remainingSuggestions, ...newSuggestions];
    });
  }, []);

  const registerEditorActions = useCallback((actions: EditorActions) => {
    setEditorActions(actions);
  }, []);

  const applySuggestion = useCallback((suggestionId: string, value: string) => {
    if (editorActions) {
      editorActions.apply(suggestionId, value);
      // Remove the suggestion from the list after applying
      setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
    }
  }, [editorActions]);

  const ignoreSuggestion = useCallback((suggestionId: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  }, []);

  const filteredSuggestions = useMemo(() => {
    if (filter.categories.length === 0) {
      return suggestions;
    }
    return suggestions.filter(s => filter.categories.includes(s.category));
  }, [suggestions, filter]);

  return (
    <SuggestionContext.Provider
      value={{
        suggestions,
        filteredSuggestions,
        metrics,
        filter,
        hoveredSuggestionId,
        setSuggestions,
        setMetrics,
        setFilter,
        setHoveredSuggestionId,
        addSuggestions,
        registerEditorActions,
        applySuggestion,
        ignoreSuggestion,
        replaceSuggestionsByCategories
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