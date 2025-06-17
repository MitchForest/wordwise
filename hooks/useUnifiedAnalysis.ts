'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { UnifiedAnalysisEngine } from '@/services/analysis/engine';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { UnifiedSuggestion } from '@/types/suggestions';

export const useUnifiedAnalysis = (doc: any, isReady: boolean) => {
  const { setSuggestions } = useSuggestions();
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [instantSuggestions, setInstantSuggestions] = useState<UnifiedSuggestion[]>([]);
  const [fastSuggestions, setFastSuggestions] = useState<UnifiedSuggestion[]>([]);
  
  const engine = useMemo(() => new UnifiedAnalysisEngine(), []);

  // Initialize the engine once.
  useEffect(() => {
    engine.initialize().then(() => {
      setIsEngineReady(true);
    });
  }, [engine]);

  // Combine suggestions from all tiers.
  useEffect(() => {
    const allSuggestions = [...instantSuggestions, ...fastSuggestions];
    setSuggestions(allSuggestions);
  }, [instantSuggestions, fastSuggestions, setSuggestions]);

  // Debounced callback for instant checks (e.g., spelling).
  const debouncedInstantCheck = useDebouncedCallback((currentDoc) => {
    if (!isReady || !isEngineReady || !currentDoc) {
      setInstantSuggestions([]);
      return;
    }
    const results = engine.runInstantChecks(currentDoc);
    setInstantSuggestions(results);
  }, 300);

  // Debounced callback for fast checks (e.g., style, grammar).
  const debouncedFastCheck = useDebouncedCallback((currentDoc) => {
    if (!isReady || !isEngineReady || !currentDoc) {
      setFastSuggestions([]);
      return;
    }
    console.log('[Debug] Running fast checks...');
    const results = engine.runFastChecks(currentDoc);
    console.log('[Debug] Fast check results:', results);
    setFastSuggestions(results);
  }, 800);

  // Trigger analysis when the document changes.
  useEffect(() => {
    if (doc) {
      debouncedInstantCheck(doc);
      debouncedFastCheck(doc);
    }
  }, [doc, debouncedInstantCheck, debouncedFastCheck]);
}; 