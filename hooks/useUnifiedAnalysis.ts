'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { useDebounce, useDebouncedCallback } from 'use-debounce';
import { UnifiedAnalysisEngine } from '@/services/analysis/engine';
import { useSuggestions } from '@/contexts/SuggestionContext';

export const useUnifiedAnalysis = (doc: any, isReady: boolean) => {
  const { setSuggestions } = useSuggestions();
  const [isEngineReady, setIsEngineReady] = useState(false);
  const engine = useMemo(() => new UnifiedAnalysisEngine(), []);

  // Initialize the engine once.
  useEffect(() => {
    engine.initialize().then(() => {
      setIsEngineReady(true);
    });
  }, [engine]);

  // Debounce the document content to avoid running analysis on every keystroke.
  const [debouncedDoc] = useDebounce(doc, 500);

  useEffect(() => {
    if (!isReady || !isEngineReady || !debouncedDoc) {
      setSuggestions([]);
      return;
    }

    // Extract text content from the TipTap document structure.
    const textContent = debouncedDoc.textContent ?? '';
    
    if (textContent.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Pass the entire document to the engine.
    const results = engine.run(debouncedDoc);
    setSuggestions(results);

  }, [debouncedDoc, isReady, isEngineReady, engine, setSuggestions]);
}; 