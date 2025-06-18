/**
 * @file hooks/useUnifiedAnalysis.ts
 * @purpose This hook is the client-side bridge to the analysis API. It uses a
 * multi-tiered debounce strategy to provide responsive feedback. Real-time
 * spell checks are sent instantly, fast checks (style, grammar) are sent after
 * a short delay, and deep metric analysis is sent after a longer delay.
 */
'use client';

import { useEffect, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useSuggestions } from '@/contexts/SuggestionContext';
import { Node } from '@tiptap/pm/model';
import { toast } from 'sonner';

export const useUnifiedAnalysis = (
  doc: Node | null,
  isReady: boolean,
  documentMetadata: {
    title: string;
    metaDescription: string;
    targetKeyword: string;
    keywords: string[];
  }
) => {
  const { setSuggestions, setMetrics, addSuggestions, replaceSuggestionsByCategories } = useSuggestions();

  // Immediate check to clear suggestions if the document is empty
  useEffect(() => {
    if (isReady && (!doc || doc.textContent.trim().length === 0)) {
      setSuggestions([]);
      setMetrics(null);
    }
  }, [doc, isReady, setSuggestions, setMetrics]);

  // Tier 2: Deep Analysis (Metrics, SEO) - Long debounce
  const debouncedDeepAnalysis = useDebouncedCallback(async (currentDoc, metadata) => {
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 5) {
      setMetrics(null);
      return;
    }
    try {
      const response = await fetch('/api/analysis/deep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: currentDoc.toJSON(), documentMetadata: metadata }),
      });
      if (!response.ok) throw new Error(`Deep analysis request failed: ${response.status}`);
      const { suggestions, metrics } = await response.json();
      setMetrics(metrics || null);
      if (suggestions && suggestions.length > 0) {
        addSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch deep analysis:', error);
      toast.error('Deep analysis service is unavailable.');
    }
  }, 2000);

  // Tier 1: Fast Analysis (Grammar, Style, Spelling) - Short debounce
  const debouncedFastAnalysis = useDebouncedCallback(async (currentDoc) => {
    if (!isReady || !currentDoc || currentDoc.textContent.trim().length < 2) {
      // If the document is too short, clear out all fast-check categories
      replaceSuggestionsByCategories(['grammar', 'style', 'spelling'], []);
      return;
    }
    try {
      const response = await fetch('/api/analysis/fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: currentDoc.toJSON() }),
      });
      if (!response.ok) throw new Error(`Fast analysis request failed: ${response.status}`);
      const { suggestions } = await response.json();
      replaceSuggestionsByCategories(['grammar', 'style', 'spelling'], suggestions || []);
    } catch (error) {
      console.error('Failed to fetch fast analysis:', error);
      toast.error('Fast analysis service is unavailable.');
    }
  }, 500);

  // Tier 0: Real-time Spell Check (as user types)
  const runRealtimeSpellCheck = useCallback(async (word: string, currentDoc: Node) => {
    if (!word || !currentDoc) return;
    try {
      const response = await fetch('/api/analysis/spell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, doc: currentDoc.toJSON() }),
      });
      if (!response.ok) throw new Error('Real-time spell check failed');
      const { suggestions } = await response.json();
      if (suggestions && suggestions.length > 0) {
        addSuggestions(suggestions);
      }
    } catch (error) {
      console.error('Real-time spell check error:', error);
    }
  }, [addSuggestions]);

  // Main effect to orchestrate all checks
  useEffect(() => {
    debouncedDeepAnalysis(doc, documentMetadata);
    debouncedFastAnalysis(doc);
  }, [doc, JSON.stringify(documentMetadata), debouncedDeepAnalysis, debouncedFastAnalysis]);

  // We return the real-time checker so it can be called by the editor
  return { runRealtimeSpellCheck, debouncedFastAnalysis };
}; 