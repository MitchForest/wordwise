'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { UnifiedSuggestion } from '@/types/suggestions';

interface EditorActions {
  apply: (suggestionId: string, value: string) => void;
}

interface SuggestionContextType {
  suggestions: UnifiedSuggestion[];
  setSuggestions: (suggestions: UnifiedSuggestion[]) => void;
  registerEditorActions: (actions: EditorActions) => void;
  applySuggestion: (suggestionId: string, value: string) => void;
  ignoreSuggestion: (suggestionId: string) => void;
}

const SuggestionContext = createContext<SuggestionContextType | undefined>(undefined);

export const SuggestionProvider = ({ children }: { children: ReactNode }) => {
  const [suggestions, setSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [editorActions, setEditorActions] = useState<EditorActions | null>(null);

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

  return (
    <SuggestionContext.Provider
      value={{
        suggestions,
        setSuggestions,
        registerEditorActions,
        applySuggestion,
        ignoreSuggestion
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